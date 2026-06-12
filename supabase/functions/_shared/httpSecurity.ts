// Shared request hardening for public Edge Functions.
// deno-lint-ignore-file no-explicit-any

const MAX_JSON_BYTES = 16 * 1024;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function configuredOrigins() {
  const values = [
    Deno.env.get("APP_BASE_URL") || "",
    ...(Deno.env.get("ALLOWED_ORIGINS") || "").split(","),
  ];

  if ((Deno.env.get("ENVIRONMENT") || "").toLowerCase() !== "production") {
    values.push("http://localhost:5173", "http://127.0.0.1:5173");
  }

  return new Set(values.map((value) => normalizeOrigin(value.trim())).filter(Boolean));
}

export function isAllowedOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return configuredOrigins().has(normalizeOrigin(origin));
}

export function securityHeaders(req: Request) {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, apikey, x-client-info, x-signature, x-request-id",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };

  if (origin && isAllowedOrigin(req)) {
    headers["Access-Control-Allow-Origin"] = normalizeOrigin(origin);
    headers.Vary = "Origin";
  }

  return headers;
}

export function jsonResponse(
  req: Request,
  data: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...securityHeaders(req),
      ...extraHeaders,
    },
  });
}

export function handlePreflight(req: Request) {
  if (!isAllowedOrigin(req)) {
    return jsonResponse(req, { error: "origin_not_allowed" }, 403);
  }
  return new Response(null, { status: 204, headers: securityHeaders(req) });
}

export async function readJsonObject(req: Request, maxBytes = MAX_JSON_BYTES) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { data: null, error: "content_type_required", status: 415 };
  }

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { data: null, error: "request_too_large", status: 413 };
  }

  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return { data: null, error: "request_too_large", status: 413 };
  }

  try {
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return { data: null, error: "invalid_json_object", status: 400 };
    }
    return { data: parsed, error: null, status: 200 };
  } catch {
    return { data: null, error: "invalid_json", status: 400 };
  }
}

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

export async function checkRateLimit(
  client: any,
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const { data, error } = await client
    .rpc("consume_api_rate_limit", {
      p_key: key.slice(0, 200),
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    .maybeSingle();

  if (error || !data) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: 30,
      unavailable: true,
    };
  }

  return {
    allowed: Boolean(data.allowed),
    remaining: Math.max(0, Number(data.remaining) || 0),
    retryAfter: Math.max(1, Number(data.retry_after) || 1),
    unavailable: false,
  };
}

export function rateLimitResponse(req: Request, result: any) {
  if (result.unavailable) {
    return jsonResponse(
      req,
      { error: "security_service_unavailable", message: "Intenta de nuevo en unos segundos." },
      503,
      { "Retry-After": String(result.retryAfter) },
    );
  }

  return jsonResponse(
    req,
    { error: "rate_limit_exceeded", message: "Demasiados intentos. Espera antes de reintentar." },
    429,
    {
      "Retry-After": String(result.retryAfter),
      "X-RateLimit-Remaining": String(result.remaining),
    },
  );
}

export function mercadoPagoOrderAudit(providerOrder: any) {
  const transaction = Array.isArray(providerOrder?.transactions?.payments)
    ? providerOrder.transactions.payments[0] || null
    : null;

  return {
    id: providerOrder?.id || null,
    status: providerOrder?.status || null,
    status_detail: providerOrder?.status_detail || null,
    external_reference: providerOrder?.external_reference || null,
    total_amount: providerOrder?.total_amount || null,
    total_paid_amount: providerOrder?.total_paid_amount || null,
    currency: providerOrder?.currency || null,
    transaction: transaction
      ? {
          id: transaction.id || null,
          status: transaction.status || null,
          status_detail: transaction.status_detail || null,
          amount: transaction.amount || null,
          paid_amount: transaction.paid_amount || null,
          payment_method_id: transaction.payment_method?.id || null,
          payment_method_type: transaction.payment_method?.type || null,
          installments: transaction.payment_method?.installments || null,
          has_security_challenge: Boolean(
            transaction.payment_method?.transaction_security?.url,
          ),
        }
      : null,
  };
}

export function mercadoPagoPaymentAudit(payment: any) {
  return {
    id: payment?.id || null,
    status: payment?.status || null,
    status_detail: payment?.status_detail || null,
    external_reference: payment?.external_reference || null,
    preference_id: payment?.preference_id || null,
    transaction_amount: payment?.transaction_amount || null,
    total_paid_amount: payment?.transaction_details?.total_paid_amount || null,
    currency_id: payment?.currency_id || null,
    payment_method_id: payment?.payment_method_id || null,
    payment_type_id: payment?.payment_type_id || null,
    installments: payment?.installments || null,
  };
}
