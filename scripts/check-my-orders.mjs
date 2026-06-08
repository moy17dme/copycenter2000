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

const email = process.env.USER_EMAIL;
const password = process.env.USER_PASSWORD;
if (!email || !password) throw new Error("Define USER_EMAIL y USER_PASSWORD.");

const localEnv = readDotEnv(path.join(process.cwd(), ".env"));
const supabase = createClient(localEnv.VITE_SUPABASE_URL, localEnv.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const signedIn = await supabase.auth.signInWithPassword({ email, password });
if (signedIn.error) throw signedIn.error;

const userId = signedIn.data.user.id;
const { data, error } = await supabase
  .from("orders")
  .select("id, status, created_at")
  .eq("user_id", userId)
  .order("created_at", { ascending: false });

if (error) throw error;

console.log(JSON.stringify({ email, count: data.length }, null, 2));
