import express from "express";
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import multer from "multer";

const execFileAsync = promisify(execFile);

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT = 8787 } = process.env;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 40 * 1024 * 1024;
const CONVERTER_ENABLED =
  String(process.env.ENABLE_DOCUMENT_CONVERTER || "").toLowerCase() === "true";
const ALLOWED_EXTENSIONS = new Set(["doc", "docx", "ppt", "pptx", "xls", "xlsx"]);
const ALLOWED_ORIGINS = new Set(
  [
    process.env.APP_BASE_URL,
    ...(process.env.ALLOWED_ORIGINS || "").split(","),
  ]
    .map((value) => {
      try {
        return new URL(String(value || "").trim()).origin;
      } catch {
        return "";
      }
    })
    .filter(Boolean)
);

const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 5,
  },
  fileFilter: (_req, file, callback) => {
    const allowed = ALLOWED_EXTENSIONS.has(extOf(file.originalname));
    callback(allowed ? null : new Error("Tipo de archivo no permitido"), allowed);
  },
});

// Both routes require Supabase authentication and the server-side rate limiter.
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use((req, res, next) => {
  if (!CONVERTER_ENABLED) {
    return res.status(404).json({ error: "converter_disabled" });
  }
  next();
});

app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ error: "origin_not_allowed" });
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

function extOf(name = "") {
  const i = String(name).lastIndexOf(".");
  return i >= 0 ? String(name).slice(i + 1).toLowerCase() : "";
}
function withoutExt(p) {
  const base = path.basename(p);
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(0, i) : base;
}

async function mkTmpDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), "conv-"));
}

async function convertToPdf(inputPath, outDir) {
  await execFileAsync("soffice", [
    "--headless",
    "--nologo",
    "--nofirststartwizard",
    "--convert-to",
    "pdf",
    "--outdir",
    outDir,
    inputPath,
  ], {
    timeout: 45_000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
}

async function requireAuth(req, res, next) {
  if (!supabase) {
    return res.status(503).json({ error: "security_service_unavailable" });
  }

  const match = String(req.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  const token = match?.[1] || "";
  if (!token) return res.status(401).json({ error: "auth_required" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id || !data.user.email_confirmed_at) {
    return res.status(401).json({ error: "invalid_session" });
  }

  const rate = await supabase
    .rpc("consume_api_rate_limit", {
      p_key: `converter:${data.user.id}`,
      p_limit: 5,
      p_window_seconds: 600,
    })
    .maybeSingle();
  if (rate.error || !rate.data) {
    return res.status(503).json({ error: "security_service_unavailable" });
  }
  if (!rate.data.allowed) {
    res.setHeader("Retry-After", String(rate.data.retry_after || 60));
    return res.status(429).json({ error: "rate_limit_exceeded" });
  }

  req.user = data.user;
  next();
}

/**
 * ✅ Convertir usando Supabase Storage (bucket + filePath)
 * Regresa URL firmada del PDF subido a Storage
 */
app.post("/convert", requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        error: "Supabase no configurado",
        detail: "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const bucket = "order-files";
    const filePath = String(req.body?.filePath || "");
    const pathMatch = filePath.match(
      /^orders\/([0-9a-f-]{36})\/[A-Za-z0-9._/-]+$/i
    );
    if (!pathMatch || !ALLOWED_EXTENSIONS.has(extOf(filePath))) {
      return res.status(400).json({ error: "filePath no permitido" });
    }

    const { data: ownedOrder, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", pathMatch[1])
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (orderError || !ownedOrder) {
      return res.status(403).json({ error: "file_not_owned_by_user" });
    }

    const baseName = withoutExt(filePath);
    const ext = extOf(filePath) || "bin";

    const tmpDir = await mkTmpDir();

    try {
      // 1) Signed URL del archivo original
      const { data: signed, error: e1 } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 120);

      if (e1 || !signed?.signedUrl) {
        return res
          .status(500)
          .json({ error: "No se pudo firmar URL", detail: e1?.message });
      }

      // 2) Descargar
      const r = await fetch(signed.signedUrl);
      if (!r.ok) throw new Error(`Descarga falló: ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.byteLength < 1 || buf.byteLength > MAX_UPLOAD_BYTES) {
        return res.status(413).json({ error: "Archivo fuera del limite permitido" });
      }

      // 3) Guardar input con extensión real
      const inputPath = path.join(tmpDir, `input.${ext}`);
      await fs.writeFile(inputPath, buf);

      // 4) Convertir a PDF
      await convertToPdf(inputPath, tmpDir);

      const outPath = path.join(tmpDir, "input.pdf");
      const pdfBuf = await fs.readFile(outPath);
      if (pdfBuf.byteLength < 1 || pdfBuf.byteLength > MAX_OUTPUT_BYTES) {
        return res.status(422).json({ error: "PDF convertido fuera del limite permitido" });
      }

      // 5) Subir preview a storage
      const previewPath = `orders/${pathMatch[1]}/previews/${baseName}.pdf`;

      const { error: e2 } = await supabase.storage
        .from(bucket)
        .upload(previewPath, pdfBuf, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (e2) {
        return res
          .status(500)
          .json({ error: "No se pudo subir el PDF", detail: e2.message });
      }

      // 6) Firmar URL del PDF (1h)
      const { data: signedPdf, error: e3 } = await supabase.storage
        .from(bucket)
        .createSignedUrl(previewPath, 60 * 60);

      if (e3 || !signedPdf?.signedUrl) {
        return res
          .status(500)
          .json({ error: "No se pudo firmar PDF", detail: e3?.message });
      }

      return res.json({
        previewPath,
        previewUrl: signedPdf.signedUrl,
      });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Conversion falló", detail: err?.message || String(err) });
  }
});

/**
 * ✅ Convertir por upload (FormData)
 * Regresa el PDF en la respuesta (Content-Type: application/pdf)
 */
app.post("/convert-upload", requireAuth, upload.single("file"), async (req, res) => {
  const tmpDir = await mkTmpDir();

  try {
    if (!req.file?.path) return res.status(400).json({ error: "Falta file" });

    const ext = extOf(req.file.originalname) || "bin";

    // Renombrar el archivo temporal a input.<ext>
    const inputPath = path.join(tmpDir, `input.${ext}`);
    await fs.rename(req.file.path, inputPath);

    // Convertir a PDF
    await convertToPdf(inputPath, tmpDir);

    const outPath = path.join(tmpDir, "input.pdf");
    const pdfBuf = await fs.readFile(outPath);
    if (pdfBuf.byteLength < 1 || pdfBuf.byteLength > MAX_OUTPUT_BYTES) {
      return res.status(422).json({ error: "PDF convertido fuera del limite permitido" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuf);
  } catch (e) {
    res.status(500).json({ error: "Conversion falló", detail: e?.message });
  } finally {
    // Limpieza
    await fs.rm(tmpDir, { recursive: true, force: true });
    // multer dejó un archivo en /tmp (ya lo movimos), pero si algo falló antes del rename:
    if (req.file?.path) {
      try {
        await fs.rm(req.file.path, { force: true });
      } catch {}
    }
  }
});

// ✅ listen al final
app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "El archivo supera 25 MB" });
  }
  return res.status(400).json({ error: error?.message || "Solicitud no valida" });
});

app.listen(PORT, () => console.log(`Converter en :${PORT}`));
