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

const owned = await admin
  .from("orders")
  .select("id", { count: "exact", head: true })
  .not("user_id", "is", null);

const guest = await admin
  .from("orders")
  .select("id", { count: "exact", head: true })
  .is("user_id", null);

if (owned.error) throw owned.error;
if (guest.error) throw guest.error;

console.log(JSON.stringify({ owned: owned.count, guest: guest.count }, null, 2));
