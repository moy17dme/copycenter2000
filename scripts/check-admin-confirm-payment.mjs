import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function readDotEnv(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD.");

const localEnv = readDotEnv(path.join(process.cwd(), ".env"));
const service = createClient(
  localEnv.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SERVICE_ROLE_KEY,
  {
  auth: { persistSession: false },
  }
);

const created = await service
  .from("orders")
  .insert({
    customer_name: "__confirm_payment_probe__",
    customer_phone: "0000000000",
    customer_email: "probe@example.invalid",
    items: [],
    payment_method: "transfer",
    payment_status: "pending",
    status: "pending_payment",
  })
  .select("id")
  .single();
if (created.error) throw created.error;

const orderId = created.data.id;

try {
  const admin = createClient(localEnv.VITE_SUPABASE_URL, localEnv.VITE_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const signedIn = await admin.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;

  const update = await admin.from("orders").update({ status: "paid" }).eq("id", orderId);
  if (update.error) throw update.error;

  const history = await admin
    .from("order_status_history")
    .insert({ order_id: orderId, status: "paid", message: "Pago confirmado" });
  if (history.error) throw history.error;

  console.log(JSON.stringify({ ok: true, orderId }, null, 2));
} finally {
  await service.from("orders").delete().eq("id", orderId);
}
