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

const localEnv = readDotEnv(path.join(process.cwd(), ".env"));

if (!localEnv.VITE_SUPABASE_URL || !localEnv.VITE_SERVICE_ROLE_KEY) {
  throw new Error("Faltan VITE_SUPABASE_URL o VITE_SERVICE_ROLE_KEY en .env.");
}

const admin = createClient(localEnv.VITE_SUPABASE_URL, localEnv.VITE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const usersRes = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersRes.error) throw usersRes.error;

const userByEmail = new Map(
  usersRes.data.users
    .filter((user) => user.email)
    .map((user) => [user.email.toLowerCase(), user.id])
);

const ordersRes = await admin
  .from("orders")
  .select("id, customer_email, user_id")
  .is("user_id", null)
  .not("customer_email", "is", null);

if (ordersRes.error) throw ordersRes.error;

let repaired = 0;
const skipped = [];

for (const order of ordersRes.data || []) {
  const userId = userByEmail.get(String(order.customer_email || "").toLowerCase());
  if (!userId) {
    skipped.push(order.id);
    continue;
  }

  const updateRes = await admin
    .from("orders")
    .update({ user_id: userId })
    .eq("id", order.id);

  if (updateRes.error) throw updateRes.error;
  repaired += 1;
}

console.log(JSON.stringify({ repaired, skipped: skipped.length }, null, 2));
