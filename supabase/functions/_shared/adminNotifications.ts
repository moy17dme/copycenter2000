// Server-only admin notifications for orders.
// deno-lint-ignore-file no-explicit-any

type NotifyEventType = "new_order" | "payment_confirmed";

type ChannelResult = {
  channel: "email" | "whatsapp";
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
  id?: string;
};

const EVENT_LABELS: Record<NotifyEventType, string> = {
  new_order: "Nuevo pedido recibido",
  payment_confirmed: "Pedido pagado listo para realizar",
};

function env(name: string) {
  return (Deno.env.get(name) || "").trim();
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shortOrderId(order: any) {
  return String(order?.id || "").slice(0, 8).toUpperCase();
}

function money(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return amount.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

function orderTotal(order: any) {
  const pricing = order?.pricing_summary || order?.pricing || {};
  const direct = Number(
    order?.total_amount ??
      order?.amount_total ??
      order?.order_total ??
      order?.total ??
      pricing?.total
  );
  if (Number.isFinite(direct) && direct > 0) return direct;

  const items = Array.isArray(order?.items) ? order.items : [];
  const sum = items.reduce((acc: number, item: any) => {
    const total = Number(item?.pricing?.total ?? item?.price?.total ?? item?.line_total);
    return Number.isFinite(total) ? acc + total : acc;
  }, 0);
  return sum > 0 ? sum : null;
}

function createdAtLabel(order: any) {
  const date = order?.created_at ? new Date(order.created_at) : new Date();
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function adminOrderUrl(order: any) {
  const base = env("APP_BASE_URL").replace(/\/+$/, "");
  if (!base || !base.startsWith("https://")) return "";
  return `${base}/admin`;
}

function itemLines(order: any) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return ["Sin partidas registradas"];

  return items.slice(0, 12).map((item: any, index: number) => {
    const label = item?.serviceLabel || item?.serviceKey || "Servicio";
    const qty = item?.pricing?.qty || item?.qty || item?.quantity || "";
    const file = item?.fileName ? ` - ${item.fileName}` : "";
    const total = item?.pricing?.total ? ` - ${money(item.pricing.total)}` : "";
    return `${index + 1}. ${label}${qty ? ` x${qty}` : ""}${file}${total}`;
  });
}

function buildMessage(order: any, eventType: NotifyEventType) {
  const title = EVENT_LABELS[eventType];
  const shortId = shortOrderId(order);
  const total = orderTotal(order);
  const lines = [
    `*${title}*`,
    "",
    `Pedido: #${shortId}`,
    `Cliente: ${order?.customer_name || "Sin nombre"}`,
    order?.customer_phone ? `Telefono: ${order.customer_phone}` : "",
    order?.customer_email ? `Correo: ${order.customer_email}` : "",
    `Estado: ${order?.status || "sin estado"}`,
    `Pago: ${order?.payment_method || "sin metodo"} / ${order?.payment_status || "sin estado"}`,
    total ? `Total: ${money(total)}` : "Total: por cotizar",
    `Fecha: ${createdAtLabel(order)}`,
    "",
    "Servicios:",
    ...itemLines(order),
  ].filter(Boolean);

  const url = adminOrderUrl(order);
  if (url) lines.push("", `Abrir panel: ${url}`);
  return lines.join("\n");
}

function buildEmailHtml(order: any, eventType: NotifyEventType, text: string) {
  const title = EVENT_LABELS[eventType];
  const url = adminOrderUrl(order);
  const rows = itemLines(order)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin:0 0 12px">${escapeHtml(title)}</h2>
      <p><strong>Pedido:</strong> #${escapeHtml(shortOrderId(order))}</p>
      <p><strong>Cliente:</strong> ${escapeHtml(order?.customer_name || "Sin nombre")}</p>
      <p><strong>Telefono:</strong> ${escapeHtml(order?.customer_phone || "No registrado")}</p>
      <p><strong>Correo:</strong> ${escapeHtml(order?.customer_email || "No registrado")}</p>
      <p><strong>Estado:</strong> ${escapeHtml(order?.status || "sin estado")}</p>
      <p><strong>Pago:</strong> ${escapeHtml(order?.payment_method || "sin metodo")} / ${escapeHtml(order?.payment_status || "sin estado")}</p>
      <p><strong>Total:</strong> ${escapeHtml(orderTotal(order) ? money(orderTotal(order)) : "por cotizar")}</p>
      <p><strong>Fecha:</strong> ${escapeHtml(createdAtLabel(order))}</p>
      <h3>Servicios</h3>
      <ul>${rows}</ul>
      ${url ? `<p><a href="${escapeHtml(url)}" style="color:#ea580c">Abrir panel admin</a></p>` : ""}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
      <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;background:#f8fafc;padding:12px;border-radius:8px">${escapeHtml(text)}</pre>
    </div>
  `;
}

async function sendEmail(order: any, eventType: NotifyEventType, text: string): Promise<ChannelResult> {
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM_EMAIL") || "Copy Center 2000 <onboarding@resend.dev>";
  const to = splitList(env("ADMIN_NOTIFY_EMAIL_TO") || env("ADMIN_EMAIL_TO"));

  if (!apiKey || !to.length) {
    return { channel: "email", ok: true, skipped: true };
  }

  const subject = `${EVENT_LABELS[eventType]} - Pedido #${shortOrderId(order)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html: buildEmailHtml(order, eventType, text),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      channel: "email",
      ok: false,
      status: response.status,
      error: payload?.message || payload?.error || "resend_error",
    };
  }

  return { channel: "email", ok: true, status: response.status, id: payload?.id };
}

function normalizeWhatsappAddress(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("whatsapp:")) return raw;
  if (raw.startsWith("+")) return `whatsapp:${raw}`;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const international = digits.length === 10 ? `52${digits}` : digits;
  return `whatsapp:+${international}`;
}

async function sendWhatsapp(text: string): Promise<ChannelResult> {
  const sid = env("TWILIO_ACCOUNT_SID");
  const token = env("TWILIO_AUTH_TOKEN");
  const to = normalizeWhatsappAddress(env("ADMIN_NOTIFY_WHATSAPP_TO") || env("ADMIN_WHATSAPP_TO"));
  const from = normalizeWhatsappAddress(env("TWILIO_WHATSAPP_FROM"));
  const messagingServiceSid = env("TWILIO_MESSAGING_SERVICE_SID");

  if (!sid || !token || !to || (!from && !messagingServiceSid)) {
    return { channel: "whatsapp", ok: true, skipped: true };
  }

  const params = new URLSearchParams();
  params.set("To", to);
  params.set("Body", text.slice(0, 1500));
  if (messagingServiceSid) {
    params.set("MessagingServiceSid", messagingServiceSid);
  } else {
    params.set("From", from);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      channel: "whatsapp",
      ok: false,
      status: response.status,
      error: payload?.message || payload?.error_message || "twilio_error",
    };
  }

  return { channel: "whatsapp", ok: true, status: response.status, id: payload?.sid };
}

async function reserveNotification(supabaseAdmin: any, orderId: string, eventType: NotifyEventType) {
  const { data, error } = await supabaseAdmin
    .from("admin_order_notifications")
    .insert({
      order_id: orderId,
      event_type: eventType,
      status: "pending",
    })
    .select("id")
    .single();

  if (error?.code === "23505") {
    return { duplicate: true, id: null, error: null };
  }

  return { duplicate: false, id: data?.id || null, error };
}

async function finishNotification(
  supabaseAdmin: any,
  id: string,
  status: string,
  channels: string[],
  lastError: string | null,
) {
  await supabaseAdmin
    .from("admin_order_notifications")
    .update({
      status,
      channels,
      last_error: lastError,
      sent_at: channels.length ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function notifyAdminForOrder(
  supabaseAdmin: any,
  order: any,
  eventType: NotifyEventType,
) {
  if (!order?.id) {
    return { ok: false, error: "missing_order" };
  }

  const reserved = await reserveNotification(supabaseAdmin, order.id, eventType);
  if (reserved.duplicate) {
    return { ok: true, duplicate: true, status: "duplicate", sentChannels: [] };
  }
  if (reserved.error || !reserved.id) {
    return {
      ok: false,
      error: reserved.error?.message || "notification_reservation_failed",
    };
  }

  const text = buildMessage(order, eventType);
  const results = await Promise.all([
    sendEmail(order, eventType, text),
    sendWhatsapp(text),
  ]);

  const sentChannels = results
    .filter((result) => result.ok && !result.skipped)
    .map((result) => result.channel);
  const failures = results.filter((result) => !result.ok);
  const skipped = results.filter((result) => result.skipped);
  const status =
    sentChannels.length && failures.length ? "partial" :
    sentChannels.length ? "sent" :
    skipped.length === results.length ? "skipped" :
    "failed";
  const lastError = failures.map((failure) => `${failure.channel}: ${failure.error}`).join("; ") || null;

  await finishNotification(supabaseAdmin, reserved.id, status, sentChannels, lastError);

  return {
    ok: status !== "failed",
    duplicate: false,
    status,
    sentChannels,
    results,
  };
}
