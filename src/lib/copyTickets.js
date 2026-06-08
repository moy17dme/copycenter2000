// src/lib/copyTickets.js
// Tickets de cobro de un solo uso para copias, escaneos y engargolados.

import { supabase } from "./supabaseClient";

const CHARSET = "ACDEFGHJKLMNPQRTUVWXYZ2346789";
const EXPIRE_HOURS = 4;
const MISSING_RPC_CODES = new Set(["PGRST202", "PGRST204", "42883"]);
const SETUP_MISSING_MESSAGE =
  "El modulo de tickets no esta configurado en Supabase. Ejecuta supabase_copy_tickets_extend.sql y vuelve a intentar.";

const ticketStack = new Map();

function generateCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

function normalizeCode(rawCode) {
  return String(rawCode || "").trim().toUpperCase().replace(/\s+/g, "");
}

function isMissingRpc(error) {
  const message = String(error?.message || "").toLowerCase();
  return MISSING_RPC_CODES.has(error?.code) || message.includes("function") || message.includes("rpc");
}

function schemaMissingColumn(error) {
  const msg = error?.message || "";
  return (
    msg.match(/Could not find the '([^']+)' column/)?.[1] ||
    msg.match(/column "([^"]+)" of relation/)?.[1] ||
    (error?.code === "42703" ? msg.match(/column "([^"]+)"/)?.[1] : null) ||
    null
  );
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function ticketFromRow(row, fallbackCode) {
  if (!row) return null;
  const code = normalizeCode(row.code || fallbackCode);
  const stacked = ticketStack.get(code);
  return {
    code,
    servicio: stacked?.servicio ?? row.servicio ?? null,
    descripcion: stacked?.descripcion ?? row.descripcion ?? null,
    cantidad: stacked?.cantidad ?? (row.cantidad != null ? Number(row.cantidad) : null),
    precio_unit: stacked?.precio_unit ?? money(row.precio_unit),
    total: stacked?.total ?? money(row.total),
    expires_at: row.expires_at ?? null,
  };
}

function validResult(row, fallbackCode) {
  return { valid: true, ...ticketFromRow(row, fallbackCode) };
}

function expired(row) {
  if (row?.expires_at) return new Date(row.expires_at).getTime() <= Date.now();
  if (!row?.created_at) return false;
  return Date.now() - new Date(row.created_at).getTime() > EXPIRE_HOURS * 60 * 60 * 1000;
}

async function fetchTicketByCode(code) {
  return supabase
    .from("copy_tickets")
    .select("id, code, used, created_at, servicio, descripcion, cantidad, precio_unit, total")
    .eq("code", code)
    .maybeSingle();
}

async function callTicketRpc(name, params) {
  const { data, error } = await supabase.rpc(name, params).maybeSingle();
  if (error) return { data: null, error };
  return { data, error: null };
}

function normalizeRpcResult(data, code) {
  if (!data?.valid) {
    return { valid: false, reason: data?.reason || "Codigo no valido." };
  }
  return validResult(data, code);
}

export async function createCopyTicket(meta = {}) {
  const cleanMeta = {
    servicio: meta.servicio || null,
    descripcion: meta.descripcion || null,
    cantidad: meta.cantidad != null ? Number(meta.cantidad) : null,
    precio_unit: money(meta.precio_unit),
    total: money(meta.total),
  };

  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    const row = {
      code,
      ...Object.fromEntries(
        Object.entries(cleanMeta).filter(([, value]) => value !== null && value !== undefined)
      ),
    };

    let result = await supabase
      .from("copy_tickets")
      .insert(row)
      .select()
      .single();

    if (!result.error) {
      ticketStack.set(code, cleanMeta);
      return { code, data: result.data, error: null };
    }

    lastError = result.error;
    if (result.error.code !== "23505") break;
  }

  return { code: null, data: null, error: lastError || new Error("No se pudo generar el ticket.") };
}

export async function listRecentCopyTickets(limit = 12) {
  return supabase
    .from("copy_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function validateCopyTicket(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return { valid: false, reason: "Ingresa el codigo del ticket." };

  const local = await validateCopyTicketFromTable(code);
  if (local.valid || local.found || local.blockingError) return local.result;

  const rpc = await callTicketRpc("validate_copy_ticket", { ticket_code: code });
  if (!rpc.error) return normalizeRpcResult(rpc.data, code);
  if (!isMissingRpc(rpc.error)) {
    return { valid: false, reason: rpc.error.message || "No se pudo validar el codigo." };
  }

  return { valid: false, reason: SETUP_MISSING_MESSAGE };
}

async function validateCopyTicketFromTable(code) {
  const { data, error } = await fetchTicketByCode(code);
  if (error) {
    return {
      valid: false,
      found: false,
      blockingError: true,
      result: { valid: false, reason: error.message || "No se pudo validar el codigo." },
    };
  }
  if (!data) {
    return { valid: false, found: false, blockingError: false, result: null };
  }
  if (data.used) {
    return {
      valid: false,
      found: true,
      blockingError: false,
      result: { valid: false, reason: "Este codigo ya fue utilizado." },
    };
  }
  if (expired(data)) {
    return {
      valid: false,
      found: true,
      blockingError: false,
      result: { valid: false, reason: `El codigo expiro (valido ${EXPIRE_HOURS} horas). Solicita uno nuevo.` },
    };
  }

  return { valid: true, found: true, blockingError: false, result: validResult(data, code), data };
}

export async function redeemCopyTicket(rawCode, { orderId = null } = {}) {
  const code = normalizeCode(rawCode);
  if (!code) return { valid: false, reason: "Ingresa el codigo del ticket." };

  const local = await redeemCopyTicketFromTable(code, { orderId });
  if (local.valid || local.found || local.blockingError) return local.result;

  const rpc = await callTicketRpc("redeem_copy_ticket", {
    ticket_code: code,
    ticket_order_id: orderId,
  });
  if (!rpc.error) {
    const result = normalizeRpcResult(rpc.data, code);
    if (result.valid) ticketStack.delete(code);
    return result;
  }
  if (!isMissingRpc(rpc.error)) {
    return { valid: false, reason: rpc.error.message || "No se pudo canjear el codigo." };
  }

  return { valid: false, reason: SETUP_MISSING_MESSAGE };
}

async function redeemCopyTicketFromTable(code, { orderId = null } = {}) {
  const checked = await validateCopyTicketFromTable(code);
  if (!checked.valid) return checked;

  const updatePayload = {
    used: true,
    used_at: new Date().toISOString(),
  };
  if (orderId) updatePayload.redeemed_order_id = orderId;

  let updateResult = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    updateResult = await supabase
      .from("copy_tickets")
      .update(updatePayload)
      .eq("id", checked.data.id)
      .eq("used", false)
      .select("code, servicio, descripcion, cantidad, precio_unit, total")
      .maybeSingle();

    const missingColumn = schemaMissingColumn(updateResult.error);
    if (!missingColumn || !(missingColumn in updatePayload)) break;
    delete updatePayload[missingColumn];
  }

  if (updateResult.error || !updateResult.data) {
    return {
      valid: false,
      found: true,
      blockingError: false,
      result: { valid: false, reason: "Este codigo ya fue utilizado o no se pudo validar." },
    };
  }

  ticketStack.delete(code);
  return { valid: true, found: true, blockingError: false, result: validResult(updateResult.data, code) };
}
