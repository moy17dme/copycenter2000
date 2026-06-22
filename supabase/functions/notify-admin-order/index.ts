// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { notifyAdminForOrder } from "../_shared/adminNotifications.ts";
import {
  checkRateLimit,
  handlePreflight,
  isAllowedOrigin,
  isUuid,
  jsonResponse,
  rateLimitResponse,
  readJsonObject,
} from "../_shared/httpSecurity.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL secret");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY secret");

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handlePreflight(req);
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "method_not_allowed" }, 405);
  }
  if (!isAllowedOrigin(req)) {
    return jsonResponse(req, { error: "origin_not_allowed" }, 403);
  }

  const token = bearerToken(req);
  if (!token) return jsonResponse(req, { error: "auth_required" }, 401);

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user || null;
  if (userError || !user) return jsonResponse(req, { error: "invalid_session" }, 401);
  if (!user.email_confirmed_at) {
    return jsonResponse(req, { error: "email_confirmation_required" }, 403);
  }

  const parsedBody = await readJsonObject(req);
  if (parsedBody.error) {
    return jsonResponse(req, { error: parsedBody.error }, parsedBody.status);
  }

  const body = parsedBody.data;
  const orderId = String(body?.orderId || "").trim();
  const eventType = String(body?.eventType || "new_order").trim();
  if (!isUuid(orderId)) {
    return jsonResponse(req, { error: "invalid_order_id" }, 400);
  }
  if (eventType !== "new_order") {
    return jsonResponse(req, { error: "invalid_event_type" }, 400);
  }

  const rateLimit = await checkRateLimit(
    supabaseAdmin,
    `admin-notify:${eventType}:${user.id}`,
    12,
    10 * 60,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(req, rateLimit);
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) return jsonResponse(req, { error: "order_not_found" }, 404);
  if (order.user_id !== user.id) {
    return jsonResponse(req, { error: "order_not_owned_by_user" }, 403);
  }

  const result = await notifyAdminForOrder(supabaseAdmin, order, "new_order");
  return jsonResponse(req, result, result.ok ? 200 : 502);
});
