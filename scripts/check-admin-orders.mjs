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
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD.");
}

const supabase = createClient(localEnv.VITE_SUPABASE_URL, localEnv.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const signedIn = await supabase.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword,
});
if (signedIn.error) throw signedIn.error;

const { data, error } = await supabase
  .from("orders")
  .select("*, order_status_history(status, message, created_at)")
  .order("created_at", { ascending: false })
  .limit(5);

if (error) {
  console.log(JSON.stringify({ ok: false, error }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, count: data.length }, null, 2));
