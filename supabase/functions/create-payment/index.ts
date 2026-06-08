// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { calculateOrderPricing } from "../_shared/orderPricing.js";

const MP_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "";
const MP_WEBHOOK_URL = Deno.env.get("MP_WEBHOOK_URL") || "";
const MP_CHECKOUT_MODE = (Deno.env.get("MP_CHECKOUT_MODE") || "").toLowerCase();
const MIN_ONLINE_PAYMENT_MXN = 10;

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
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function appBackUrls(orderId: string) {
  const base = APP_BASE_URL.replace(/\/+$/, "");
  if (!base) return undefined;
  if (!base.startsWith("https://")) return undefined;

  const target = `${base}/mis-pedidos?order=${encodeURIComponent(orderId)}`;
  return {
    success: target,
    pending: target,
    failure: target,
  };
}

function shouldUseSandboxCheckout() {
  if (MP_CHECKOUT_MODE === "production") return false;
  if (MP_CHECKOUT_MODE === "test" || MP_CHECKOUT_MODE === "sandbox") return true;
  const base = APP_BASE_URL.replace(/\/+$/, "");
  return !base || !base.startsWith("https://");
}

function checkoutUrlMatchesMode(checkoutUrl: string, useSandbox: boolean) {
  const isSandboxUrl = checkoutUrl.includes("sandbox.mercadopago");
  return useSandbox ? isSandboxUrl : !isSandboxUrl;
}

function isAlreadyPaid(order: any) {
  const paymentStatus = String(order?.payment_status || "").toLowerCase();
  return ["approved", "paid", "confirmed", "success", "succeeded"].includes(paymentStatus) ||
    ["paid", "payment_approved", "in_progress", "printing", "ready", "completed"].includes(order?.status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const token = bearerToken(req);
  if (!token) {
    return json({ error: "auth_required" }, 401);
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user || null;
  if (userError || !user) {
    return json({ error: "invalid_session" }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const orderId = String(body?.orderId || "").trim();
  if (!orderId) {
    return json({ error: "orderId_required" }, 400);
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return json({ error: "order_not_found" }, 404);
  }

  if (!order.user_id || order.user_id !== user.id) {
    return json({ error: "order_not_owned_by_user" }, 403);
  }

  if (isAlreadyPaid(order)) {
    return json({ error: "payment_already_confirmed", message: "Este pedido ya tiene pago confirmado." }, 409);
  }

  const pricing = await calculateOrderPricing(supabaseAdmin, order);
  if (pricing.hasUnknownTotal || pricing.total <= 0) {
    return json(
      {
        error: "quote_required",
        message: "Este pedido necesita cotizacion antes de pagar en linea.",
        pricing,
      },
      422
    );
  }

  if (pricing.total < MIN_ONLINE_PAYMENT_MXN) {
    return json(
      {
        error: "minimum_payment_amount",
        message: `El pago en linea requiere un total minimo de $${MIN_ONLINE_PAYMENT_MXN.toFixed(2)} MXN.`,
        minimum: MIN_ONLINE_PAYMENT_MXN,
        pricing,
      },
      422
    );
  }

  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const backUrls = body?.back_urls || appBackUrls(order.id);
  const useSandboxCheckout = shouldUseSandboxCheckout();
  const { data: existingPayment } = await supabaseAdmin
    .from("payments")
    .select("id, provider_preference_id, checkout_url, amount, currency, status")
    .eq("order_id", order.id)
    .eq("provider", "mercadopago")
    .eq("status", "pending")
    .not("checkout_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    existingPayment?.checkout_url &&
    checkoutUrlMatchesMode(existingPayment.checkout_url, useSandboxCheckout)
  ) {
    return json({
      id: existingPayment.provider_preference_id,
      checkout_url: existingPayment.checkout_url,
      init_point: existingPayment.checkout_url,
      amount: Number(existingPayment.amount),
      currency: existingPayment.currency || pricing.currency,
      reused: true,
    });
  }

  const prefPayload: Record<string, unknown> = {
    items: [
      {
        title: `Pedido Copy Center 2000 #${shortId}`,
        quantity: 1,
        unit_price: pricing.total,
        currency_id: "MXN",
      },
    ],
    external_reference: order.id,
    metadata: {
      order_id: order.id,
      user_id: user.id,
    },
  };

  if (backUrls) {
    prefPayload.back_urls = backUrls;
    prefPayload.auto_return = "approved";
  }
  if (MP_WEBHOOK_URL) prefPayload.notification_url = MP_WEBHOOK_URL;

  const mpResp = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(prefPayload),
  });

  if (!mpResp.ok) {
    const detail = await mpResp.text();
    return json({ error: "mercadopago_preference_error", detail }, 400);
  }

  const pref = await mpResp.json();
  const checkoutUrl = useSandboxCheckout
    ? pref.sandbox_init_point || pref.init_point || null
    : pref.init_point || pref.sandbox_init_point || null;

  const { error: paymentError } = await supabaseAdmin
    .from("payments")
    .insert({
      order_id: order.id,
      provider: "mercadopago",
      provider_preference_id: pref.id,
      amount: pricing.total,
      currency: pricing.currency,
      status: "pending",
      checkout_url: checkoutUrl,
      raw_event: {
        type: "preference_created",
        preference: pref,
        pricing,
      },
    });

  if (paymentError) {
    return json({ error: "payment_record_error", detail: paymentError.message }, 500);
  }

  await supabaseAdmin
    .from("orders")
    .update({
      payment_method: "mercadopago",
      payment_status: "pending",
      status: "pending_payment",
      pricing_summary: pricing,
      coupon_code: pricing.couponCode,
    })
    .eq("id", order.id);

  return json({
    id: pref.id,
    checkout_url: checkoutUrl,
    init_point: pref.init_point,
    sandbox_init_point: pref.sandbox_init_point,
    checkout_mode: useSandboxCheckout ? "sandbox" : "production",
    amount: pricing.total,
    currency: pricing.currency,
  });
});
