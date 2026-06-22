import { supabaseAnonKey, supabaseUrl } from "./supabaseClient";

export async function notifyAdminOrder({
  orderId,
  eventType = "new_order",
  accessToken,
} = {}) {
  if (!orderId || !accessToken) {
    return { ok: false, error: "missing_notification_context" };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/notify-admin-order`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId, eventType }),
    });

    const payload = await response.json().catch(() => ({}));
    return {
      ok: response.ok && payload?.ok !== false,
      statusCode: response.status,
      ...payload,
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "admin_notification_failed",
    };
  }
}
