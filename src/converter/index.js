import express from "express";
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import multer from "multer";

const upload = multer({ dest: os.tmpdir() });
const execFileAsync = promisify(execFile);

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT = 8787 } = process.env;

// ⚠️ No “truenes” si faltan keys: /convert-upload no las necesita
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

const app = express();
app.use(express.json({ limit: "2mb" }));

// CORS simple
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
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
  ]);
}

/**
 * ✅ Convertir usando Supabase Storage (bucket + filePath)
 * Regresa URL firmada del PDF subido a Storage
 */
app.post("/convert", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        error: "Supabase no configurado",
        detail: "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const { bucket, filePath } = req.body || {};
    if (!bucket || !filePath) {
      return res.status(400).json({ error: "bucket y filePath son requeridos" });
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

      // 3) Guardar input con extensión real
      const inputPath = path.join(tmpDir, `input.${ext}`);
      await fs.writeFile(inputPath, buf);

      // 4) Convertir a PDF
      await convertToPdf(inputPath, tmpDir);

      const outPath = path.join(tmpDir, "input.pdf");
      const pdfBuf = await fs.readFile(outPath);

      // 5) Subir preview a storage
      const previewPath = `previews/${baseName}.pdf`;

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
app.post("/convert-upload", upload.single("file"), async (req, res) => {
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
app.listen(PORT, () => console.log(`Converter en :${PORT}`));
