// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  checkRateLimit,
  handlePreflight,
  isAllowedOrigin,
  isUuid,
  jsonResponse,
  rateLimitResponse,
} from "../_shared/httpSecurity.ts";
import {
  MAX_UPLOAD_BYTES,
  validatePrintableUpload,
} from "../_shared/fileValidation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES + 1024 * 1024;
const LEGAL_TERMS_VERSION = "terms-2026-06-23";
const FILE_UPLOAD_CONTRACT_VERSION = "file-responsibility-2026-06-23";
const FILE_UPLOAD_RESPONSIBILITY_STATEMENT =
  "Declaro que soy titular de los derechos o cuento con autorizacion suficiente para subir, almacenar, reproducir y solicitar el procesamiento del archivo. Acepto que soy el unico responsable del contenido y me obligo a sacar en paz y a salvo a Copy Center 2000 ante cualquier reclamacion de terceros.";

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL secret");
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY secret");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function bearerToken(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  return auth.match(/^Bearer\s+(.+)$/i)?.[1] || "";
}

function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const firstForwarded = forwarded.split(",")[0]?.trim();
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    firstForwarded ||
    null
  );
}

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isoDateOrNull(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parseLegalAcceptance(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const payload = JSON.parse(raw);
    return {
      accepted: payload?.accepted === true,
      acceptedAt: isoDateOrNull(payload?.acceptedAt),
      acceptedByName: sanitizeText(payload?.acceptedByName, 120),
      acceptedByEmail: sanitizeText(payload?.acceptedByEmail, 254),
      customerPhone: sanitizeText(payload?.customerPhone, 32),
      clientTimezone: sanitizeText(payload?.clientTimezone, 80),
      contractVersion: sanitizeText(payload?.contractVersion, 80),
      termsVersion: sanitizeText(payload?.termsVersion, 80),
      statement: sanitizeText(payload?.statement, 2000),
    };
  } catch {
    return null;
  }
}

function safeBaseName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return normalized || "archivo";
}

function uploadErrorMessage(code: string) {
  const messages: Record<string, string> = {
    empty_file: "El archivo esta vacio.",
    file_too_large: "El archivo supera el limite de 25 MB.",
    pdf_required: "La constancia debe ser un PDF valido.",
    unsupported_file_type: "Solo se permiten archivos PDF, PNG o JPG/JPEG.",
    invalid_pdf_signature: "El archivo no contiene una firma PDF valida.",
    incomplete_pdf: "El PDF esta incompleto o danado.",
    appended_pdf_payload: "El PDF contiene datos no permitidos despues de su cierre.",
    active_or_encrypted_pdf:
      "El PDF contiene contenido activo, adjuntos o cifrado no permitido.",
    invalid_png_signature: "El archivo no contiene una firma PNG valida.",
    invalid_png_header: "La cabecera PNG no es valida.",
    incomplete_or_appended_png:
      "El PNG esta incompleto o contiene datos agregados.",
    invalid_or_appended_jpeg:
      "El JPEG esta incompleto o contiene datos agregados.",
    invalid_image_dimensions: "La imagen tiene dimensiones no permitidas.",
  };
  return messages[code] || "El archivo no paso la validacion de seguridad.";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handlePreflight(req);
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "method_not_allowed" }, 405);
  }
  if (!isAllowedOrigin(req)) {
    return jsonResponse(req, { error: "origin_not_allowed" }, 403);
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    return jsonResponse(req, { error: "multipart_form_required" }, 415);
  }
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MULTIPART_BYTES) {
    return jsonResponse(req, {
      error: "request_too_large",
      message: "El archivo supera el limite de 25 MB.",
    }, 413);
  }

  const token = bearerToken(req);
  if (!token) return jsonResponse(req, { error: "auth_required" }, 401);

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user) {
    return jsonResponse(req, { error: "invalid_session" }, 401);
  }
  if (!user.email_confirmed_at) {
    return jsonResponse(req, { error: "email_confirmation_required" }, 403);
  }

  const userRate = await checkRateLimit(
    supabaseAdmin,
    `upload:file:user:${user.id}`,
    60,
    3600,
  );
  if (!userRate.allowed) return rateLimitResponse(req, userRate);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonResponse(req, { error: "invalid_multipart_form" }, 400);
  }

  const orderId = String(form.get("orderId") || "");
  const itemId = String(form.get("itemId") || "").slice(0, 80);
  const kind = String(form.get("kind") || "order_file");
  const file = form.get("file");
  if (!isUuid(orderId)) {
    return jsonResponse(req, { error: "invalid_order_id" }, 400);
  }
  if (!["order_file", "constancia_fiscal"].includes(kind)) {
    return jsonResponse(req, { error: "invalid_file_kind" }, 400);
  }
  const legalAcceptance = parseLegalAcceptance(form.get("legalAcceptance"));
  if (kind === "order_file") {
    if (!legalAcceptance?.accepted) {
      return jsonResponse(req, {
        error: "legal_acceptance_required",
        message: "Acepta la declaracion de responsabilidad para subir archivos.",
      }, 400);
    }
    if (
      legalAcceptance.contractVersion !== FILE_UPLOAD_CONTRACT_VERSION ||
      legalAcceptance.termsVersion !== LEGAL_TERMS_VERSION
    ) {
      return jsonResponse(req, {
        error: "stale_legal_acceptance",
        message: "Actualiza la pagina y acepta la version vigente de terminos.",
      }, 409);
    }
  }
  if (!(file instanceof File)) {
    return jsonResponse(req, { error: "file_required" }, 400);
  }
  if (!file.name || file.size < 1 || file.size > MAX_UPLOAD_BYTES) {
    return jsonResponse(req, {
      error: "invalid_file_size",
      message: "El archivo debe pesar entre 1 byte y 25 MB.",
    }, 400);
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id,user_id,status,customer_name,customer_email")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (orderError) {
    return jsonResponse(req, { error: "order_lookup_failed" }, 503);
  }
  if (!order) return jsonResponse(req, { error: "order_not_found" }, 404);
  if (order.status === "cancelled") {
    return jsonResponse(req, { error: "cancelled_order" }, 409);
  }

  const orderRate = await checkRateLimit(
    supabaseAdmin,
    `upload:file:order:${orderId}`,
    55,
    3600,
  );
  if (!orderRate.allowed) return rateLimitResponse(req, orderRate);

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return jsonResponse(req, { error: "file_read_failed" }, 400);
  }

  const inspection = validatePrintableUpload(file.name, bytes, {
    pdfOnly: kind === "constancia_fiscal",
  });
  if (!inspection.ok) {
    return jsonResponse(req, {
      error: "unsafe_or_invalid_file",
      code: inspection.error,
      message: uploadErrorMessage(inspection.error),
    }, 422);
  }
  const fileSha256 = await sha256Hex(bytes);

  const baseName = safeBaseName(file.name);
  const uniquePart = crypto.randomUUID();
  const prefix = kind === "constancia_fiscal"
    ? `constancia_${user.id}`
    : `${itemId || "item"}_${uniquePart}`;
  const path =
    `orders/${orderId}/${prefix}_${baseName}.${inspection.type.extension}`;

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from("order-files")
    .upload(path, bytes, {
      upsert: false,
      contentType: inspection.type.mimeType,
      cacheControl: "3600",
    });
  if (uploadError) {
    console.error("[upload-order-file] storage upload failed", {
      orderId,
      userId: user.id,
      code: uploadError.name,
    });
    return jsonResponse(req, { error: "storage_upload_failed" }, 503);
  }

  let acceptanceId: string | null = null;
  if (kind === "order_file" && legalAcceptance) {
    const acceptedByName =
      legalAcceptance.acceptedByName ||
      sanitizeText(order.customer_name, 120) ||
      sanitizeText(user.user_metadata?.full_name, 120);
    const acceptedByEmail =
      legalAcceptance.acceptedByEmail ||
      sanitizeText(order.customer_email, 254) ||
      sanitizeText(user.email, 254);
    const statement = legalAcceptance.statement || FILE_UPLOAD_RESPONSIBILITY_STATEMENT;
    const contractText = [
      statement,
      `Archivo: ${file.name.slice(0, 180)}`,
      `Usuario: ${acceptedByName || acceptedByEmail || user.id}`,
      `Pedido: ${orderId}`,
      `Hash SHA-256: ${fileSha256}`,
    ].join("\n");

    const { data: acceptance, error: acceptanceError } = await supabaseAdmin
      .from("file_upload_acceptances")
      .insert({
        order_id: orderId,
        user_id: user.id,
        item_id: itemId || null,
        storage_path: uploadData.path,
        original_name: file.name.slice(0, 180),
        mime_type: inspection.type.mimeType,
        file_size: bytes.length,
        file_sha256: fileSha256,
        terms_version: legalAcceptance.termsVersion,
        contract_version: legalAcceptance.contractVersion,
        accepted_statement: statement,
        contract_text: contractText,
        accepted_by_name: acceptedByName || null,
        accepted_by_email: acceptedByEmail || null,
        customer_phone: legalAcceptance.customerPhone || null,
        client_accepted_at: legalAcceptance.acceptedAt,
        client_timezone: legalAcceptance.clientTimezone || null,
        user_agent: sanitizeText(req.headers.get("user-agent"), 500) || null,
        ip_address: clientIp(req),
      })
      .select("id")
      .single();

    if (acceptanceError) {
      console.error("[upload-order-file] acceptance insert failed", {
        orderId,
        userId: user.id,
        storagePath: uploadData.path,
        code: acceptanceError.code,
        message: acceptanceError.message,
      });
      await supabaseAdmin.storage.from("order-files").remove([uploadData.path]);
      return jsonResponse(req, { error: "file_acceptance_record_failed" }, 503);
    }
    acceptanceId = acceptance?.id || null;
  }

  return jsonResponse(req, {
    path: uploadData.path,
    originalName: file.name.slice(0, 180),
    size: bytes.length,
    mimeType: inspection.type.mimeType,
    fileSha256,
    acceptanceId,
    type: kind,
  }, 201);
});
