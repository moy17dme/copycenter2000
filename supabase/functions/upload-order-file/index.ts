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
    .select("id,user_id,status")
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

  return jsonResponse(req, {
    path: uploadData.path,
    originalName: file.name.slice(0, 180),
    size: bytes.length,
    mimeType: inspection.type.mimeType,
    type: kind,
  }, 201);
});
