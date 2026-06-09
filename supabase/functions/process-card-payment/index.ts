// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { calculateOrderPricing, roundMoney } from "../_shared/orderPricing.js";

const MP_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MIN_ONLINE_PAYMENT_MXN = 50;

if (!MP_TOKEN) throw new Error("Missing MP_ACCESS_TOKEN secret");
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL secret");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY secret");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function bearerToken(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  return auth.match(/^Bearer\s+(.+)$/i)?.[1] || "";
}

function paymentTransaction(order: any) {
  return Array.isArray(order?.transactions?.payments)
    ? order.transactions.payments[0] || null
    : null;
}

function normalizedStatus(order: any) {
  const transaction = paymentTransaction(order);
  const status = String(transaction?.status || order?.status || "unknown");
  const detail = String(transaction?.status_detail || order?.status_detail || "unknown");
  const approved = status === "processed" && detail === "accredited";

  return {
    approved,
    status: approved ? "approved" : status,
    statusDetail: detail,
    transaction,
  };
}

function challengeUrl(order: any) {
  return paymentTransaction(order)?.payment_method?.transaction_security?.url || null;
}

function paidAmount(order: any) {
  const transaction = paymentTransaction(order);
  return roundMoney(
    transaction?.paid_amount ??
    order?.total_paid_amount ??
    transaction?.amount ??
    order?.total_amount
  ) ?? 0;
}

async function fetchMercadoPagoOrder(providerOrderId: string) {
  const response = await fetch(
    `https://api.mercadopago.com/v1/orders/${encodeURIComponent(providerOrderId)}`,
    { headers: { Authorization: `Bearer ${MP_TOKEN}` } }
  );
  const text = await response.text();
  let payload: any = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { detail: text };
  }

  return { response, payload };
}

async function paymentTypeFor(methodId: string) {
  const response = await fetch("https://api.mercadopago.com/v1/payment_methods", {
    headers: { Authorization: `Bearer ${MP_TOKEN}` },
  });
  if (!response.ok) return "";
  const methods = await response.json().catch(() => []);
  return methods.find((method: any) => method?.id === methodId)?.payment_type_id || "";
}

async function findPaymentRecord(orderId: string, providerOrderId?: string | null) {
  if (providerOrderId) {
    const byProviderOrder = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("provider", "mercadopago")
      .eq("provider_order_id", providerOrderId)
      .maybeSingle();
    if (byProviderOrder.data) return byProviderOrder.data;
  }

  const latest = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("provider", "mercadopago")
    .eq("order_id", orderId)
    .not("provider_order_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return latest.data || null;
}

async function savePaymentRecord({
  internalOrderId,
  providerOrder,
  expectedAmount,
  expectedCurrency,
  source,
}: {
  internalOrderId: string;
  providerOrder: any;
  expectedAmount: number;
  expectedCurrency: string;
  source: string;
}) {
  const state = normalizedStatus(providerOrder);
  const providerPaymentId = state.transaction?.id ? String(state.transaction.id) : null;
  const providerOrderId = String(providerOrder.id);
  const amount = paidAmount(providerOrder);
  const currency = providerOrder.currency || expectedCurrency;
  const amountMatches =
    currency === expectedCurrency &&
    Math.abs(amount - expectedAmount) <= 0.01;
  const status = state.approved && !amountMatches ? "amount_mismatch" : state.status;
  const existing = await findPaymentRecord(internalOrderId, providerOrderId);
  const payload = {
    order_id: internalOrderId,
    provider: "mercadopago",
    provider_order_id: providerOrderId,
    provider_payment_id: providerPaymentId,
    amount: expectedAmount,
    currency: expectedCurrency,
    status,
    raw_event: {
      source,
      mercado_pago_order: providerOrder,
      expected_amount: expectedAmount,
      expected_currency: expectedCurrency,
      paid_amount: amount,
      paid_currency: currency,
      amount_matches: amountMatches,
    },
    updated_at: new Date().toISOString(),
  };

  const result = existing?.id
    ? await supabaseAdmin.from("payments").update(payload).eq("id", existing.id)
    : await supabaseAdmin.from("payments").insert(payload);

  return { result, state, amountMatches, amount, currency, status };
}

async function updateInternalOrder({
  order,
  pricing,
  approved,
  amountMatches,
  paymentStatus,
}: {
  order: any;
  pricing: any;
  approved: boolean;
  amountMatches: boolean;
  paymentStatus: string;
}) {
  if (approved && amountMatches) {
    const alreadyConfirmed = ["approved", "paid", "confirmed"].includes(
      String(order.payment_status || "").toLowerCase()
    );
    const nextOrderStatus = ["ready", "completed"].includes(order.status)
      ? order.status
      : "paid";

    const update = await supabaseAdmin
      .from("orders")
      .update({
        payment_method: "mercadopago",
        payment_status: "approved",
        status: nextOrderStatus,
        pricing_summary: pricing,
        coupon_code: pricing.couponCode,
      })
      .eq("id", order.id);

    if (!update.error && !alreadyConfirmed) {
      await supabaseAdmin.from("order_status_history").insert({
        order_id: order.id,
        status: "paid",
        message: "Pago con tarjeta confirmado por Mercado Pago",
      });
    }
    return update;
  }

  return await supabaseAdmin
    .from("orders")
    .update({
      payment_method: "mercadopago",
      payment_status: paymentStatus,
      status: "pending_payment",
      pricing_summary: pricing,
      coupon_code: pricing.couponCode,
    })
    .eq("id", order.id);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const token = bearerToken(req);
  if (!token) return json({ error: "auth_required" }, 401);

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user || null;
  if (userError || !user) return json({ error: "invalid_session" }, 401);

  const body = await req.json().catch(() => ({}));
  const internalOrderId = String(body?.orderId || "").trim();
  const operation = String(body?.operation || "create").toLowerCase();
  if (!internalOrderId) return json({ error: "orderId_required" }, 400);

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", internalOrderId)
    .single();

  if (orderError || !order) return json({ error: "order_not_found" }, 404);
  if (!order.user_id || order.user_id !== user.id) {
    return json({ error: "order_not_owned_by_user" }, 403);
  }

  const pricing = await calculateOrderPricing(supabaseAdmin, order);
  if (pricing.hasUnknownTotal || pricing.total <= 0) {
    return json({
      error: "quote_required",
      message: "Este pedido necesita cotizacion antes de pagar en linea.",
      pricing,
    }, 422);
  }
  if (pricing.total < MIN_ONLINE_PAYMENT_MXN) {
    return json({
      error: "minimum_payment_amount",
      message: `El pago en linea requiere un total minimo de $${MIN_ONLINE_PAYMENT_MXN.toFixed(2)} MXN.`,
      minimum: MIN_ONLINE_PAYMENT_MXN,
      pricing,
    }, 422);
  }

  if (operation === "quote") {
    return json({
      amount: pricing.total,
      currency: pricing.currency,
      pricing,
    });
  }

  if (operation === "status") {
    const existing = await findPaymentRecord(internalOrderId);
    if (!existing?.provider_order_id) {
      return json({ error: "provider_order_not_found" }, 404);
    }

    const fetched = await fetchMercadoPagoOrder(existing.provider_order_id);
    if (!fetched.response.ok) {
      return json({
        error: "mercadopago_order_error",
        detail: fetched.payload,
      }, fetched.response.status);
    }

    const saved = await savePaymentRecord({
      internalOrderId,
      providerOrder: fetched.payload,
      expectedAmount: pricing.total,
      expectedCurrency: pricing.currency,
      source: "status_query",
    });
    if (saved.result.error) {
      return json({ error: "payment_record_error", detail: saved.result.error.message }, 500);
    }

    await updateInternalOrder({
      order,
      pricing,
      approved: saved.state.approved,
      amountMatches: saved.amountMatches,
      paymentStatus: saved.status,
    });

    return json({
      provider_order_id: fetched.payload.id,
      provider_payment_id: saved.state.transaction?.id || null,
      status: saved.status,
      status_detail: saved.state.statusDetail,
      approved: saved.state.approved && saved.amountMatches,
      challenge_url: challengeUrl(fetched.payload),
    });
  }

  if (["approved", "paid", "confirmed"].includes(String(order.payment_status || "").toLowerCase())) {
    return json({ error: "payment_already_confirmed" }, 409);
  }

  const formData = body?.formData || {};
  const tokenizedCard = String(formData?.token || "").trim();
  const paymentMethodId = String(formData?.payment_method_id || "").trim();
  const installments = Math.max(1, Math.trunc(Number(formData?.installments) || 1));
  const attemptId = String(body?.attemptId || crypto.randomUUID()).trim();
  if (!tokenizedCard || !paymentMethodId) {
    return json({ error: "card_data_required" }, 400);
  }

  let paymentTypeId = String(
    body?.paymentTypeId ||
    formData?.payment_type_id ||
    ""
  ).trim();
  if (!paymentTypeId) paymentTypeId = await paymentTypeFor(paymentMethodId);
  if (!["credit_card", "debit_card", "prepaid_card"].includes(paymentTypeId)) {
    return json({ error: "invalid_payment_type", paymentTypeId }, 400);
  }

  const payerEmail = String(formData?.payer?.email || user.email || "").trim();
  if (!payerEmail) return json({ error: "payer_email_required" }, 400);

  const identificationType = String(formData?.payer?.identification?.type || "").trim();
  const identificationNumber = String(formData?.payer?.identification?.number || "").trim();
  const payer: Record<string, unknown> = { email: payerEmail };
  if (identificationType && identificationNumber) {
    payer.identification = {
      type: identificationType,
      number: identificationNumber,
    };
  }

  const amount = pricing.total.toFixed(2);
  const payload = {
    type: "online",
    processing_mode: "automatic",
    capture_mode: "automatic_async",
    external_reference: order.id,
    total_amount: amount,
    payer,
    transactions: {
      payments: [
        {
          amount,
          payment_method: {
            id: paymentMethodId,
            type: paymentTypeId,
            token: tokenizedCard,
            installments,
          },
        },
      ],
    },
    config: {
      online: {
        transaction_security: {
          validation: "on_fraud_risk",
          liability_shift: "required",
        },
      },
    },
  };

  const mpResponse = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MP_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `${order.id}:${attemptId}`,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await mpResponse.text();
  let providerOrder: any = {};
  try {
    providerOrder = responseText ? JSON.parse(responseText) : {};
  } catch {
    providerOrder = { detail: responseText };
  }

  if (!mpResponse.ok) {
    return json({
      error: "mercadopago_order_error",
      message: "Mercado Pago no pudo procesar la tarjeta.",
      detail: providerOrder,
    }, mpResponse.status >= 500 ? 502 : 422);
  }

  const saved = await savePaymentRecord({
    internalOrderId,
    providerOrder,
    expectedAmount: pricing.total,
    expectedCurrency: pricing.currency,
    source: "order_created",
  });
  if (saved.result.error) {
    return json({ error: "payment_record_error", detail: saved.result.error.message }, 500);
  }

  const orderUpdate = await updateInternalOrder({
    order,
    pricing,
    approved: saved.state.approved,
    amountMatches: saved.amountMatches,
    paymentStatus: saved.status,
  });
  if (orderUpdate.error) {
    return json({ error: "order_update_error", detail: orderUpdate.error.message }, 500);
  }

  return json({
    provider_order_id: providerOrder.id,
    provider_payment_id: saved.state.transaction?.id || null,
    status: saved.status,
    status_detail: saved.state.statusDetail,
    approved: saved.state.approved && saved.amountMatches,
    challenge_url: challengeUrl(providerOrder),
    amount: pricing.total,
    currency: pricing.currency,
  });
});
