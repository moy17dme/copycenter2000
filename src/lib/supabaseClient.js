// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import { recoveryLocation } from "./passwordRecovery";

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
const recovery = typeof window === 'undefined' ? {} : recoveryLocation(new URL(window.location.href));
export const passwordRecoveryError = recovery.error || null;
if (recovery.implicit && window.location.pathname !== '/reset-password') {
  // A legacy email can land at Site URL; route it before React mounts.
  window.history.replaceState(window.history.state, '', `/reset-password${window.location.search}${window.location.hash}`);
}

export const supabase = globalThis[supabaseSingletonKey] || createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Server-requested recovery emails carry tokens, not a browser PKCE verifier.
    // Keep PKCE for normal sign-in and browser-requested recovery codes.
    flowType: recovery.implicit ? "implicit" : "pkce",
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
