// deno-lint-ignore-file no-explicit-any
// Setup types para APIs de Supabase Edge Runtime
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Secret de Mercado Pago (lo configuraste en Edge Functions → Secrets)
const MP_TOKEN = Deno.env.get("MP_ACCESS_TOKEN"); // TEST-... en sandbox
if (!MP_TOKEN) {
  throw new Error("Missing MP_ACCESS_TOKEN secret");
}

// ÚNICA función serve (maneja preflight y POST)
Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    orderId,
    title = "Pedido Copy Center 2000",
    quantity = 1,
    unit_price = 10,
    back_urls,
    auto_return = "approved",
    external_reference,
  } = body || {};

  if (!orderId) {
    return new Response(JSON.stringify({ error: "orderId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" },
    });
  }

  const prefPayload = {
    items: [
      {
        title,
        quantity,
        unit_price,
        currency_id: "MXN",
      },
    ],
    auto_return,
    back_urls: back_urls ?? {
      success: "https://example.com/success",
      pending: "https://example.com/pending",
      failure: "https://example.com/failure",
    },
    external_reference: external_reference ?? orderId,
  };

  const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(prefPayload),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    return new Response(JSON.stringify({ error: "MP error", detail: txt }), {
      status: 400,
      headers: { "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" },
    });
  }

  const pref = await resp.json();
  return new Response(
    JSON.stringify({
      id: pref.id,
      init_point: pref.init_point || pref.sandbox_init_point,
      sandbox_init_point: pref.sandbox_init_point,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
});
