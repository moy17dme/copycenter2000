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
const admin = createClient(localEnv.VITE_SUPABASE_URL, localEnv.VITE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const base = {
  customer_name: "__probe__",
  customer_phone: "0000000000",
  customer_email: "probe@example.invalid",
  items: [],
  notes: "temporary status probe",
  payment_method: "transfer",
  payment_status: "pending",
  status: "pending_payment",
};

const created = await admin.from("orders").insert(base).select("id").single();
if (created.error) throw created.error;

const orderId = created.data.id;
const candidates = [
  "pending_payment",
  "payment_approved",
  "pending",
  "approved",
  "paid",
  "confirmed",
  "processing",
  "in_progress",
  "printing",
  "ready",
  "completed",
  "cancelled",
  "canceled",
];

const allowed = [];
const rejected = {};

try {
  for (const status of candidates) {
    const res = await admin.from("orders").update({ status }).eq("id", orderId);
    if (res.error) {
      rejected[status] = res.error.message;
    } else {
      allowed.push(status);
    }
  }
} finally {
  await admin.from("orders").delete().eq("id", orderId);
}

console.log(JSON.stringify({ allowed, rejected }, null, 2));
