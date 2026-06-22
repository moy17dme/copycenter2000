// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { notifyAdminForOrder } from "../_shared/adminNotifications.ts";
import { calculateOrderPricing, roundMoney } from "../_shared/orderPricing.js";
import {
  checkRateLimit,
  jsonResponse,
  mercadoPagoOrderAudit,
  mercadoPagoPaymentAudit,
  rateLimitResponse,
  readJsonObject,
  securityHeaders,
} from "../_shared/httpSecurity.ts";

const MP_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!MP_TOKEN) throw new Error("Missing MP_ACCESS_TOKEN secret");
if (!MP_WEBHOOK_SECRET) throw new Error("Missing MP_WEBHOOK_SECRET secret");
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL secret");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY secret");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function parseSignatureHeader(header: string) {
  return Object.fromEntries(
    header
      .split(",")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
  );
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function normalizeDataId(value: unknown) {
  if (value == null) return "";
  const raw = String(value);
  return /^[a-z0-9]+$/i.test(raw) ? raw.toLowerCase() : raw;
}

async function verifyMercadoPagoSignature(req: Request, dataId: string) {
  const xSignature = req.headers.get("x-signature") || "";
  const xRequestId = req.headers.get("x-request-id") || "";
  if (!xSignature || !xRequestId) return false;

  const parsed = parseSignatureHeader(xSignature);
  const ts = parsed.ts || "";
  const v1 = parsed.v1 || "";
  if (!ts || !v1) return false;
  if (!/^\d{10,13}$/.test(ts) || !/^[a-f0-9]{64}$/i.test(v1)) return false;

  const timestampNumber = Number(ts);
  const timestampMs = ts.length >= 13 ? timestampNumber : timestampNumber * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    return false;
  }

  let manifest = "";
  if (dataId) manifest += `id:${normalizeDataId(dataId)};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  if (ts) manifest += `ts:${ts};`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(MP_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
  return timingSafeEqual(toHex(signature), v1.toLowerCase());
}

function paymentIdFrom(url: URL, body: any) {
  const direct =
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    body?.data?.id ||
    body?.id;

  if (direct) return String(direct);

  const resource = body?.resource || url.searchParams.get("resource") || "";
  const match = String(resource).match(/payments\/(\d+)/i);
  return match?.[1] || "";
}

async function fetchMercadoPagoPayment(paymentId: string) {
  const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${MP_TOKEN}` },
  });

  if (!resp.ok) {
    return { payment: null, error: await resp.text(), status: resp.status };
  }

  return { payment: await resp.json(), error: null, status: resp.status };
}

async function fetchMercadoPagoOrder(providerOrderId: string) {
  const resp = await fetch(
    `https://api.mercadopago.com/v1/orders/${encodeURIComponent(providerOrderId)}`,
    { headers: { Authorization: `Bearer ${MP_TOKEN}` } }
  );

  if (!resp.ok) {
    return { order: null, error: await resp.text(), status: resp.status };
  }

  return { order: await resp.json(), error: null, status: resp.status };
}

function orderPaymentTransaction(providerOrder: any) {
  return Array.isArray(providerOrder?.transactions?.payments)
    ? providerOrder.transactions.payments[0] || null
    : null;
}

async function findExpectedOrderPayment(
  orderId: string,
  providerOrderId: string,
  providerPaymentId: string | null
) {
  const byOrder = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("provider", "mercadopago")
    .eq("provider_order_id", providerOrderId)
    .maybeSingle();
  if (byOrder.data) return byOrder.data;

  if (providerPaymentId) {
    const byPayment = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("provider", "mercadopago")
      .eq("provider_payment_id", providerPaymentId)
      .maybeSingle();
    if (byPayment.data) return byPayment.data;
  }

  const latest = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("provider", "mercadopago")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return latest.data || null;
}

async function findExpectedPayment(orderId: string, payment: any) {
  const preferenceId = payment?.preference_id || null;
  const providerPaymentId = payment.id ? String(payment.id) : null;

  if (providerPaymentId) {
    const byPayment = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("provider", "mercadopago")
      .eq("provider_payment_id", providerPaymentId)
      .maybeSingle();
    if (byPayment.data) return byPayment.data;
  }

  if (preferenceId) {
    const byPreference = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("provider", "mercadopago")
      .eq("provider_preference_id", preferenceId)
      .eq("order_id", orderId)
      .maybeSingle();
    if (byPreference.data) return byPreference.data;
  }

  return null;
}

async function savePaymentRecord({
  orderId,
  payment,
  providerOrderId = null,
  status,
  amount,
  currency,
  rawEvent,
}: {
  orderId: string;
  payment: any;
  providerOrderId?: string | null;
  status: string;
  amount: number;
  currency: string;
  rawEvent: Record<string, unknown>;
}) {
  const providerPaymentId = payment?.id ? String(payment.id) : null;
  const preferenceId = payment.preference_id || null;
  let existing = null;

  if (providerOrderId) {
    const byOrder = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("provider", "mercadopago")
      .eq("provider_order_id", providerOrderId)
      .maybeSingle();
    existing = byOrder.data;
  }

  if (!existing && providerPaymentId) {
    const byPayment = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("provider", "mercadopago")
      .eq("provider_payment_id", providerPaymentId)
      .maybeSingle();
    existing = byPayment.data;
  }

  if (!existing && preferenceId) {
    const byPreference = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("provider", "mercadopago")
      .eq("provider_preference_id", preferenceId)
      .eq("order_id", orderId)
      .maybeSingle();
    existing = byPreference.data;
  }

  const payload = {
    order_id: orderId,
    provider: "mercadopago",
    provider_order_id: providerOrderId,
    provider_preference_id: preferenceId,
    provider_payment_id: providerPaymentId,
    amount,
    currency,
    status,
    raw_event: rawEvent,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    return await supabaseAdmin
      .from("payments")
      .update(payload)
      .eq("id", existing.id);
  }

  return await supabaseAdmin
    .from("payments")
    .insert(payload);
}

function isAlreadyConfirmed(order: any) {
  const paymentStatus = String(order?.payment_status || "").toLowerCase();
  return ["approved", "paid", "confirmed", "success", "succeeded"].includes(paymentStatus) ||
    ["paid", "payment_approved", "in_progress", "printing", "ready", "completed"].includes(order?.status);
}

async function handleOrderNotification(req: Request, body: any, providerOrderId: string) {
  if (!/^ord/i.test(providerOrderId)) {
    return jsonResponse(req, {
      ok: true,
      ignored: "invalid_order_id",
      providerOrderId,
    });
  }

  const fetched = await fetchMercadoPagoOrder(providerOrderId);
  if (!fetched.order) {
    if (fetched.status === 404) {
      return jsonResponse(req, {
        ok: true,
        ignored: "order_not_found",
        providerOrderId,
      });
    }
    return jsonResponse(req, { error: "mercadopago_order_error" }, 502);
  }

  const providerOrder = fetched.order;
  const orderId = providerOrder.external_reference || null;
  if (!orderId) {
    return jsonResponse(req, { ok: true, ignored: "missing_external_reference" });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (orderError || !order) {
    return jsonResponse(req, { ok: true, ignored: "internal_order_not_found" });
  }

  const pricing = await calculateOrderPricing(supabaseAdmin, order);
  const transaction = orderPaymentTransaction(providerOrder);
  const providerPaymentId = transaction?.id ? String(transaction.id) : null;
  const expectedPayment = await findExpectedOrderPayment(
    orderId,
    String(providerOrder.id),
    providerPaymentId
  );
  const paidAmount = roundMoney(
    transaction?.paid_amount ??
    providerOrder.total_paid_amount ??
    transaction?.amount ??
    providerOrder.total_amount
  ) ?? 0;
  const currency = providerOrder.currency || expectedPayment?.currency || pricing.currency;
  const expectedAmount = roundMoney(expectedPayment?.amount) ?? pricing.total;
  const expectedCurrency = expectedPayment?.currency || pricing.currency;
  const amountMatches =
    currency === expectedCurrency &&
    Math.abs(paidAmount - expectedAmount) <= 0.01;
  const providerStatus = String(transaction?.status || providerOrder.status || "unknown");
  const statusDetail = String(
    transaction?.status_detail ||
    providerOrder.status_detail ||
    "unknown"
  );
  const approved = providerStatus === "processed" && statusDetail === "accredited";
  const paymentStatus = approved && amountMatches
    ? "approved"
    : approved
      ? "amount_mismatch"
      : providerStatus;

  const paymentRecord = await savePaymentRecord({
    orderId,
    payment: transaction || {},
    providerOrderId: String(providerOrder.id),
    status: paymentStatus,
    amount: paidAmount || expectedAmount,
    currency,
    rawEvent: {
      webhook: body,
      mercado_pago_order: mercadoPagoOrderAudit(providerOrder),
      pricing,
      expectedPaymentId: expectedPayment?.id || null,
      expectedAmount,
      expectedCurrency,
      amountMatches,
    },
  });
  if (paymentRecord.error) {
    return jsonResponse(req, { error: "payment_record_error" }, 500);
  }

  if (approved && amountMatches) {
    const alreadyConfirmed = isAlreadyConfirmed(order);
    const nextOrderStatus = ["ready", "completed"].includes(order.status) ? order.status : "paid";
    const updateOrder = await supabaseAdmin
      .from("orders")
      .update({
        payment_method: "mercadopago",
        payment_status: "approved",
        status: nextOrderStatus,
        pricing_summary: pricing,
        coupon_code: pricing.couponCode,
      })
      .eq("id", orderId);

    if (updateOrder.error) {
      return jsonResponse(req, { error: "order_update_error" }, 500);
    }

    if (!alreadyConfirmed) {
      await supabaseAdmin.from("order_status_history").insert({
        order_id: orderId,
        status: "paid",
        message: "Pago con tarjeta confirmado por Mercado Pago",
      });
      await notifyAdminForOrder(
        supabaseAdmin,
        {
          ...order,
          payment_method: "mercadopago",
          payment_status: "approved",
          status: nextOrderStatus,
          pricing_summary: pricing,
          coupon_code: pricing.couponCode,
        },
        "payment_confirmed",
      ).catch((error) => {
        console.error("[admin-notify] payment_confirmed failed", error?.message || error);
      });
    }

    return jsonResponse(req, { ok: true, status: "approved", orderId, amount: paidAmount });
  }

  await supabaseAdmin
    .from("orders")
    .update({
      payment_method: "mercadopago",
      payment_status: paymentStatus,
      status: "pending_payment",
      pricing_summary: pricing,
      coupon_code: pricing.couponCode,
    })
    .eq("id", orderId);

  return jsonResponse(req, {
    ok: true,
    status: paymentStatus,
    statusDetail,
    orderId,
    amount: paidAmount,
    expected: expectedAmount,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: securityHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "method_not_allowed" }, 405);
  }

  const url = new URL(req.url);
  const parsedBody = await readJsonObject(req, 32 * 1024);
  if (parsedBody.error) {
    return jsonResponse(req, { error: parsedBody.error }, parsedBody.status);
  }
  const body = parsedBody.data;
  const eventType = String(
    body?.type ||
    url.searchParams.get("type") ||
    ""
  ).toLowerCase();
  const directResourceId = String(
    url.searchParams.get("data.id") ||
    body?.data?.id ||
    body?.id ||
    ""
  );
  const isOrderEvent =
    eventType === "order" ||
    eventType === "orders" ||
    /^ord/i.test(directResourceId);
  const paymentId = isOrderEvent ? "" : paymentIdFrom(url, body);
  const resourceId = isOrderEvent ? directResourceId : paymentId;
  if (!resourceId) {
    return jsonResponse(req, { ok: true, ignored: "missing_resource_id" });
  }
  if (
    (isOrderEvent && !/^ord[a-z0-9_-]{1,100}$/i.test(resourceId)) ||
    (!isOrderEvent && !/^\d{1,30}$/.test(resourceId))
  ) {
    return jsonResponse(req, { error: "invalid_resource_id" }, 400);
  }

  const dataIdForSignature = url.searchParams.get("data.id") || body?.data?.id || resourceId;
  const signatureOk = await verifyMercadoPagoSignature(req, String(dataIdForSignature));
  if (!signatureOk) {
    return jsonResponse(req, { error: "invalid_signature" }, 401);
  }

  const rateLimit = await checkRateLimit(
    supabaseAdmin,
    `webhook:mercadopago:${resourceId}`,
    30,
    10 * 60,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(req, rateLimit);
  }

  if (isOrderEvent) {
    return await handleOrderNotification(req, body, resourceId);
  }

  const fetched = await fetchMercadoPagoPayment(paymentId);
  if (!fetched.payment) {
    if (fetched.status === 404) {
      return jsonResponse(req, {
        ok: true,
        ignored: "payment_not_found",
        paymentId,
      });
    }
    return jsonResponse(req, { error: "mercadopago_payment_error" }, 502);
  }

  const payment = fetched.payment;
  const orderId = payment.external_reference || payment.metadata?.order_id || null;
  if (!orderId) {
    return jsonResponse(req, { ok: true, ignored: "missing_external_reference" });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return jsonResponse(req, { ok: true, ignored: "order_not_found" });
  }

  const pricing = await calculateOrderPricing(supabaseAdmin, order);
  const expectedPayment = await findExpectedPayment(orderId, payment);
  const paidAmount = roundMoney(payment.transaction_amount ?? payment.transaction_details?.total_paid_amount) ?? 0;
  const currency = payment.currency_id || "MXN";
  const expectedAmount = roundMoney(expectedPayment?.amount) ?? pricing.total;
  const expectedCurrency = expectedPayment?.currency || pricing.currency;
  const amountMatches =
    Number.isFinite(expectedAmount) &&
    currency === expectedCurrency &&
    Math.abs(paidAmount - expectedAmount) <= 0.01;
  const approved = payment.status === "approved";
  const paymentStatus = approved && amountMatches ? "approved" : (
    approved && !amountMatches ? "amount_mismatch" : String(payment.status || "unknown")
  );

  const rawEvent = {
    webhook: body,
    mercado_pago_payment: mercadoPagoPaymentAudit(payment),
    pricing,
    expectedPaymentId: expectedPayment?.id || null,
    expectedAmount,
    expectedCurrency,
    amountMatches,
  };

  const paymentRecord = await savePaymentRecord({
    orderId,
    payment,
    status: paymentStatus,
    amount: paidAmount,
    currency,
    rawEvent,
  });

  if (paymentRecord.error) {
    return jsonResponse(req, { error: "payment_record_error" }, 500);
  }

  if (approved && amountMatches) {
    const alreadyConfirmed = isAlreadyConfirmed(order);
    const nextOrderStatus = ["ready", "completed"].includes(order.status) ? order.status : "paid";

    const updateOrder = await supabaseAdmin
      .from("orders")
      .update({
        payment_method: "mercadopago",
        payment_status: "approved",
        status: nextOrderStatus,
        pricing_summary: pricing,
        coupon_code: pricing.couponCode,
      })
      .eq("id", orderId);

    if (updateOrder.error) {
      return jsonResponse(req, { error: "order_update_error" }, 500);
    }

    if (!alreadyConfirmed) {
      await supabaseAdmin
        .from("order_status_history")
        .insert({
          order_id: orderId,
          status: "paid",
          message: "Pago en linea confirmado por Mercado Pago",
        });
      await notifyAdminForOrder(
        supabaseAdmin,
        {
          ...order,
          payment_status: "approved",
          status: nextOrderStatus,
          pricing_summary: pricing,
          coupon_code: pricing.couponCode,
        },
        "payment_confirmed",
      ).catch((error) => {
        console.error("[admin-notify] payment_confirmed failed", error?.message || error);
      });
    }

    return jsonResponse(req, { ok: true, status: "approved", orderId, amount: paidAmount });
  }

  await supabaseAdmin
    .from("orders")
    .update({
      payment_status: paymentStatus,
      pricing_summary: pricing,
      coupon_code: pricing.couponCode,
    })
    .eq("id", orderId);

  return jsonResponse(req, {
    ok: true,
    status: paymentStatus,
    orderId,
    amount: paidAmount,
    expected: expectedAmount,
  });
});
