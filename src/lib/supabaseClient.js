// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseUrl = (rawUrl || "").trim().replace(/\/+$/, "");
export const supabaseAnonKey = (rawKey || "").trim();

// ✅ define una sola vez tu storageKey para usarla en TODO
export const AUTH_STORAGE_KEY = "copycenter2000-auth";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan variables de entorno: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Revisa tu .env y reinicia Vite."
  );
}

const supabaseSingletonKey = "__copycenter2000_supabase_client__";

export const supabase = globalThis[supabaseSingletonKey] || createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storageKey: AUTH_STORAGE_KEY, // ✅ ok, pero ahora hay que limpiarlo al logout
  },
});

globalThis[supabaseSingletonKey] = supabase;

export async function pingSupabase() {
  const url = `${supabaseUrl}/auth/v1/health`;
  const res = await fetch(url, {
    method: "GET",
    headers: { apikey: supabaseAnonKey },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, url, body: text };
}
