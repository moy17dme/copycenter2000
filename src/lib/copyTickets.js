// src/lib/copyTickets.js
// Admin-issued one-time tickets required to checkout copies/engargolado orders.

import { supabase } from "./supabaseClient";

// Avoid confusable chars (0/O, 1/I, 5/S, 8/B)
const CHARSET = "ACDEFGHJKLMNPQRTUVWXYZ2346789";

function generateCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

/** Admin: insert a fresh ticket and return the code to show the customer. */
export async function createCopyTicket() {
  const code = generateCode();
  const { data, error } = await supabase
    .from("copy_tickets")
    .insert({ code })
    .select()
    .single();
  return { code, data, error };
}

/**
 * Customer: validate a code, mark it used, and return { valid, reason }.
 * Codes expire after EXPIRE_HOURS hours.
 */
const EXPIRE_HOURS = 4;

export async function redeemCopyTicket(rawCode) {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, reason: "Ingresa el código del ticket." };

  const { data, error } = await supabase
    .from("copy_tickets")
    .select("id, used, created_at")
    .eq("code", code)
    .single();

  if (error || !data) return { valid: false, reason: "Código no encontrado. Pide uno al administrador." };
  if (data.used)       return { valid: false, reason: "Este código ya fue utilizado." };

  const ageMs = Date.now() - new Date(data.created_at).getTime();
  if (ageMs > EXPIRE_HOURS * 60 * 60 * 1000) {
    return { valid: false, reason: `El código expiró (válido ${EXPIRE_HOURS} horas). Solicita uno nuevo.` };
  }

  const { error: updErr } = await supabase
    .from("copy_tickets")
    .update({ used: true })
    .eq("id", data.id);

  if (updErr) return { valid: false, reason: "Error al validar el código. Inténtalo de nuevo." };

  return { valid: true };
}
