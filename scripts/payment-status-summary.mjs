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
const admin = createClient(
  localEnv.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SERVICE_ROLE_KEY,
  {
  auth: { persistSession: false },
  }
);

const { data, error } = await admin
  .from("orders")
  .select("payment_status, status")
  .limit(1000);

if (error) throw error;

const paymentStatus = {};
const orderStatus = {};
for (const row of data || []) {
  paymentStatus[row.payment_status || "null"] = (paymentStatus[row.payment_status || "null"] || 0) + 1;
  orderStatus[row.status || "null"] = (orderStatus[row.status || "null"] || 0) + 1;
}

console.log(JSON.stringify({ paymentStatus, orderStatus }, null, 2));
