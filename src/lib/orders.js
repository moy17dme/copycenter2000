// src/lib/orders.js
import { createClient } from "@supabase/supabase-js";
import { supabase, supabaseAnonKey, supabaseUrl } from "./supabaseClient";
import { getItemPrice, fmtMXN } from "../utils/getItemPrice";

// El cliente real es el de usuario autenticado; RLS decide permisos.
export const supabaseAdmin = supabase;

let requestClientSeq = 0;

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, value); },
    removeItem: (key) => { store.delete(key); },
  };
}

function createRequestClient(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: createMemoryStorage(),
      storageKey: `copycenter2000-request-${Date.now()}-${requestClientSeq += 1}`,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

export function createSupabaseRequestClient(accessToken) {
  return accessToken ? createRequestClient(accessToken) : supabase;
}

function withTimeout(promise, ms, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = globalThis.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => globalThis.clearTimeout(timeoutId));
}

function jwtExpiresSoon(token, skewSeconds = 90) {
  if (!token) return true;
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(globalThis.atob(normalized));
    if (!decoded.exp) return false;
    return decoded.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}

export function isAuthExpiredError(error) {
  const msg = String(error?.message || error?.error_description || error || "").toLowerCase();
  return error?.status === 401 || msg.includes("jwt") || msg.includes("expired") || msg.includes("exp claim");
}

export async function resolveAccessToken({ accessToken = null, forceRefresh = false } = {}) {
  let token = accessToken || null;

  if (!token) {
    const current = await supabase.auth.getSession();
    token = current.data?.session?.access_token || null;
  }

  if (forceRefresh || jwtExpiresSoon(token)) {
    try {
      const refreshed = await withTimeout(
        supabase.auth.refreshSession(),
        5000,
        "No se pudo refrescar la sesion."
      );
      if (!refreshed.error && refreshed.data?.session) {
        token = refreshed.data.session.access_token || null;
      }
    } catch {
      // Mantiene el token actual; la consulta posterior decidira si sigue valido.
    }
  }

  return token;
}

// ── Número WhatsApp del negocio ──────────────────────────────────
export const SHOP_PHONE = "527713531668";

// ── Etiquetas de estado en español ──────────────────────────────
export const STATUS_LABELS = {
  pending_payment:   "Pendiente de pago",
  paid:              "Empezando trabajo",
  payment_approved:  "Empezando trabajo",
  in_progress:       "Trabajando en tu pedido",
  printing:          "Terminando de imprimir",
  ready:             "Listo para recoger ✅",
  completed:         "Entregado",
  cancelled:         "Cancelado",
};

export const STATUS_ORDER = [
  "pending_payment",
  "paid",
  "ready",
];

export function isPaymentConfirmed(order) {
  const paymentStatus = String(order?.payment_status || "").toLowerCase();
  if (["approved", "paid", "confirmed", "success", "succeeded"].includes(paymentStatus)) {
    return true;
  }
  return ["paid", "payment_approved", "in_progress", "printing", "ready", "completed"].includes(order?.status);
}

function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function firstMoney(...values) {
  for (const value of values) {
    const n = roundMoney(value);
    if (n !== null) return n;
  }
  return null;
}

export function formatMoney(value) {
  const n = roundMoney(value) ?? 0;
  return fmtMXN(n);
}

export function getItemPricing(item) {
  if (!item) return null;
  const saved = item.pricing || item.price || {};
  const total = firstMoney(
    saved.total,
    saved.lineTotal,
    item.line_total,
    item.estimated_total,
    item.estimate
  );
  if (total !== null) {
    return {
      total,
      perUnit: firstMoney(saved.perUnit, saved.per_unit, item.per_unit),
      qty: Number(saved.qty ?? item.qty ?? item.quantity ?? 1) || 1,
      label: saved.label || item.price_label || "",
      currency: saved.currency || "MXN",
    };
  }

  const calculated = getItemPrice(item);
  if (!calculated) return null;
  return {
    total: roundMoney(calculated.total) ?? 0,
    perUnit: roundMoney(calculated.perUnit),
    qty: Number(calculated.qty ?? 1) || 1,
    label: calculated.label || "",
    currency: "MXN",
  };
}

export function getOrderFinancials(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const itemPricings = items.map(getItemPricing);
  const hasUnknownItems = items.length > 0 && itemPricings.some((p) => !p);
  const itemsSubtotal = roundMoney(
    itemPricings.reduce((sum, pricing) => sum + (pricing?.total || 0), 0)
  ) ?? 0;

  const pricing = order?.pricing || order?.pricing_summary || {};
  const subtotal = firstMoney(
    order?.subtotal,
    order?.subtotal_amount,
    order?.amount_subtotal,
    pricing.subtotal,
    itemsSubtotal
  ) ?? 0;
  const discount = firstMoney(
    order?.discount,
    order?.discount_amount,
    pricing.discount,
  ) ?? 0;
  const savedTotal = firstMoney(
    order?.total_amount,
    order?.amount_total,
    order?.order_total,
    order?.grand_total,
    order?.total,
    pricing.total,
  );
  const total = savedTotal ?? Math.max(0, roundMoney(subtotal - discount) ?? 0);

  return {
    subtotal,
    discount,
    total,
    currency: pricing.currency || "MXN",
    hasKnownTotal: !pricing.hasUnknownTotal && (savedTotal !== null || !hasUnknownItems),
    hasUnknownItems: Boolean(pricing.hasUnknownTotal || hasUnknownItems),
  };
}

// ── Formatear opciones de cada servicio para WhatsApp ────────────
function fmtOptions(item) {
  const o = item.options || {};
  const lines = [];

  switch (item.serviceKey) {
    case "impresion":
      lines.push(`   🎨 Color: ${o.colorMode === "bn" ? "Blanco y negro" : "Color"}`);
      if (o.paper) lines.push(`   📝 Papel: ${o.paper}`);
      if (o.printSets) lines.push(`   🔢 Juegos: ${o.printSets}`);
      if (o.finishes) {
        const f = o.finishes;
        if (f.engargolado?.enabled) lines.push(`   📌 Engargolado`);
        if (f.laminado?.enabled) lines.push(`   ✨ Laminado ${f.laminado.sides === "doble" ? "doble cara" : "una cara"}`);
        if (f.enmicado?.enabled) lines.push(`   🛡️ Enmicado`);
      }
      break;

    case "copias":
      lines.push(`   📄 Tamaño: ${o.copySize || "Carta"}`);
      lines.push(`   🎨 Tipo: ${o.copyColorMode === "color" ? "Color" : "Blanco y negro"}`);
      lines.push(`   🔢 Aprox: ${o.copyQtyApprox || 1} cop.`);
      if (o.copySides === "doble") lines.push(`   ↔️ Doble cara`);
      if (o.copyFinish && o.copyFinish !== "ninguno") {
        const finMap = { engrapado: "Engrapado", perforado_folder: "Perforado/folder", engargolado: "Engargolado" };
        lines.push(`   📌 Acabado: ${finMap[o.copyFinish] || o.copyFinish}`);
      }
      break;

    case "planos":
      lines.push(`   🎨 Color: ${o.planColorMode === "color" ? "Color" : "Blanco y negro"}`);
      if (o.planPaper) lines.push(`   📝 Papel: ${o.planPaper}`);
      if (o.planSizeKey) lines.push(`   📐 Tamaño: ${o.planSizeKey} cm`);
      if (o.planType) lines.push(`   🏗️ Tipo: ${o.planType}`);
      if (o.planDeliver) lines.push(`   📦 Entrega: ${o.planDeliver}`);
      break;

    case "artes":
      if (o.artProjectType) lines.push(`   🎭 Proyecto: ${o.artProjectType}`);
      if (o.artOutputType) lines.push(`   🖨️ Salida: ${o.artOutputType}`);
      if (o.artSize) lines.push(`   📐 Tamaño: ${o.artSize}`);
      if (o.artQtyApprox) lines.push(`   🔢 Cantidad aprox: ${o.artQtyApprox}`);
      if (o.artUrgency && o.artUrgency !== "normal") lines.push(`   ⚡ Urgente`);
      break;

    case "stickers":
      if (o.stkShape) lines.push(`   ✂️ Forma: ${o.stkShape}`);
      if (o.stkMaterial) lines.push(`   🏷️ Material: ${o.stkMaterial}`);
      {
        const qty = o.stkQtyPreset !== "custom" ? o.stkQtyPreset : o.stkQtyCustom;
        if (qty) lines.push(`   🔢 Cantidad: ${qty} pzs`);
      }
      if (o.stkSizePreset && o.stkSizePreset !== "custom")
        lines.push(`   📐 Tamaño: ${o.stkSizePreset} cm`);
      else if (o.stkWidthCm)
        lines.push(`   📐 Tamaño: ${o.stkWidthCm}x${o.stkHeightCm} cm`);
      if (o.stkLaminado) lines.push(`   ✨ Con laminado`);
      break;

    case "pvc":
      if (o.pvcVariant) lines.push(`   💳 Variante: ${o.pvcVariant}`);
      if (o.pvcSides) lines.push(`   🖨️ Caras: ${o.pvcSides}`);
      if (o.pvcVariableData) lines.push(`   🔢 Datos variables (folio/código)`);
      if (o.pvcPortaGafete) lines.push(`   🪢 + Porta gafete`);
      if (o.pvcCordon) lines.push(`   🎗️ + Cordón`);
      if (o.pvcNotes) lines.push(`   📝 Nota: ${o.pvcNotes}`);
      break;

    case "sublimacion":
      if (o.subProductType) lines.push(`   🎁 Producto: ${o.subProductType}`);
      if (o.subBaseColor) lines.push(`   🎨 Color base: ${o.subBaseColor}`);
      {
        const sizes = [];
        if (o.subSizeCH) sizes.push(`CH:${o.subSizeCH}`);
        if (o.subSizeM) sizes.push(`M:${o.subSizeM}`);
        if (o.subSizeG) sizes.push(`G:${o.subSizeG}`);
        if (o.subSizeXL) sizes.push(`XL:${o.subSizeXL}`);
        if (sizes.length) lines.push(`   📏 Tallas: ${sizes.join(", ")}`);
      }
      if (o.subRush) lines.push(`   ⚡ Urgente`);
      if (o.subDueDate) lines.push(`   📅 Fecha límite: ${o.subDueDate}`);
      if (o.subNotes) lines.push(`   📝 Nota: ${o.subNotes}`);
      break;

    case "fotobotones":
      lines.push(`   📏 Tamaño: ${o.pinSizeCm || "5.8"} cm`);
      lines.push(`   ✨ Film: ${o.pinFinish || "mate"}`);
      lines.push(`   🔢 Cantidad: ${o.pinQty || 1} pzs`);
      if (o.pinType && o.pinType !== "pin")
        lines.push(`   🔧 Tipo: ${o.pinType}`);
      if (o.pinNotes) lines.push(`   📝 Nota: ${o.pinNotes}`);
      break;

    case "escaneo":
      lines.push(`   🎨 Tipo: ${o.scanColorMode === "color" ? "Color" : "Blanco y negro"}`);
      lines.push(`   📄 Tamaño: ${o.scanSize || "Carta"}`);
      lines.push(`   🔢 Aprox: ${o.scanQtyApprox || 1} págs`);
      if (o.scanDuplex === "doble") lines.push(`   ↔️ Doble cara`);
      lines.push(`   📊 DPI: ${o.scanDpi || "300"}`);
      if (o.scanOutput) lines.push(`   💾 Salida: ${o.scanOutput}`);
      break;

    default:
      break;
  }

  return lines.join("\n");
}

// ── Construir mensaje de WhatsApp ────────────────────────────────
export function buildOrderWhatsAppMessage({ order, isNew = true }) {
  const items = order.items || [];
  const shortId = String(order.id || "").slice(0, 8).toUpperCase();
  const financials = getOrderFinancials(order);
  const fecha = new Date(order.created_at || Date.now()).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const payLabel =
    order.payment_method === "mercadopago"
      ? "Pago en linea - pendiente de confirmacion"
      : order.payment_method === "card"
        ? "Tarjeta - pendiente de confirmacion"
        : "Transferencia bancaria - pendiente de comprobante";

  const itemsText = items
    .map((it, i) => {
      const label = it.serviceLabel || it.serviceKey || "Servicio";
      const fileName = it.fileName ? `\n   📄 ${it.fileName}` : "";
      const optsText = fmtOptions(it);
      return `${i + 1}. *${label}*${fileName}${optsText ? "\n" + optsText : ""}`;
    })
    .join("\n\n");

  let msg = isNew
    ? `🖨️ *NUEVO PEDIDO — Copy Center 2000*\n\n`
    : `📋 *PEDIDO #${shortId} — Copy Center 2000*\n\n`;

  msg += `📋 Pedido *#${shortId}*\n`;
  msg += `👤 Cliente: ${order.customer_name || "Sin nombre"}\n`;
  if (order.customer_phone) msg += `📱 Teléfono: ${order.customer_phone}\n`;
  if (order.customer_email) msg += `📧 Correo: ${order.customer_email}\n`;
  msg += `\n*SERVICIOS SOLICITADOS:*\n${itemsText}\n`;
  if (financials.hasKnownTotal && financials.total > 0) {
    msg += `\n💰 *Total a pagar:* $${formatMoney(financials.total)} MXN\n`;
    if (financials.discount > 0) {
      msg += `   Subtotal: $${formatMoney(financials.subtotal)} MXN\n`;
      msg += `   Descuento: -$${formatMoney(financials.discount)} MXN\n`;
    }
  } else {
    msg += `\n💰 *Total:* por cotizar\n`;
  }
  msg += `\n💳 *Pago:* ${payLabel}\n`;
  if (order.notes) msg += `\n📝 *Instrucciones:*\n${order.notes}\n`;

  if (order.payment_method === "transfer") {
    msg += `\n⚠️ *El pedido inicia cuando se confirme la transferencia.*`;
    msg += `\nPor favor envía tu comprobante de pago a este número.`;
  }

  msg += `\n\n⏰ ${fecha}`;
  return msg;
}

// ── Abrir WhatsApp con mensaje ────────────────────────────────────
export function openWhatsApp(phone, message) {
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
}

// ── Guardar pedido en Supabase ───────────────────────────────────
function appendOrderDetailsNote(notes, pricingSummary, couponCode, billingInfo) {
  const lines = [];
  if (couponCode) lines.push(`Cupon: ${couponCode}`);
  lines.push(`Subtotal: $${formatMoney(pricingSummary.subtotal)}`);
  if (pricingSummary.discount > 0) lines.push(`Descuento: -$${formatMoney(pricingSummary.discount)}`);
  lines.push(`Total: $${formatMoney(pricingSummary.total)}`);

  const blocks = [notes, `[Resumen de pago]\n${lines.join("\n")}`];

  if (billingInfo?.requiresInvoice) {
    blocks.push(
      [
        "[Facturacion]",
        "Requiere factura: si",
        billingInfo.rfc ? `RFC: ${billingInfo.rfc}` : "",
        billingInfo.razonSocial ? `Razon social: ${billingInfo.razonSocial}` : "",
        billingInfo.email ? `Correo factura: ${billingInfo.email}` : "",
      ].filter(Boolean).join("\n")
    );
  }

  return blocks.filter(Boolean).join("\n\n");
}

// ── Guardar datos de facturación en el perfil del usuario ────────
export async function saveProfileBilling({ userId, rfc, razonSocial, constanciaPath, accessToken }) {
  if (!userId) return;
  const client = createSupabaseRequestClient(accessToken);
  const update = { rfc, razon_social: razonSocial };
  if (constanciaPath) update.constancia_path = constanciaPath;
  await withTimeout(
    client.from("profiles").update(update).eq("id", userId),
    5000,
    "Profile billing save timeout"
  ).catch(() => {}); // siempre silencioso — es un guardado secundario
}

// ── Subir constancia de situación fiscal ────────────────────────
export async function uploadConstancia(orderId, userId, file, { accessToken } = {}) {
  if (!file || !(file instanceof File || file instanceof Blob)) return null;
  const client = createRequestClient(accessToken);
  const sourceName = file.name || "constancia.pdf";
  const ext = sourceName.split(".").pop() || "pdf";
  const path = `orders/${orderId}/constancia_${userId || "guest"}.${ext}`;

  try {
    const { data, error } = await withTimeout(
      client.storage.from("order-files").upload(path, file, {
        upsert: false,
        contentType: file.type || "application/pdf",
        cacheControl: "3600",
      }),
      15000,
      "No se pudo subir la constancia. Verifica la conexion."
    );
    if (error) {
      console.warn("[upload] ERROR constancia:", error.message);
      return null;
    }
    return data?.path || path;
  } catch (error) {
    console.warn("[upload] TIMEOUT/ERROR constancia:", error?.message || error);
    return null;
  }
}

function isMissingOptionalOrderColumn(error) {
  const text = String(error?.message || error?.details || "");
  return error?.code === "PGRST204" ||
    text.includes("pricing_summary") ||
    text.includes("coupon_code");
}

export async function createOrder({
  user,
  accessToken,
  items,
  customerName,
  customerPhone,
  paymentMethod,
  notes,
  couponCode,
  discount,
  subtotal,
  total,
  billingInfo,
}) {
  // Limpiar File objects (no serializables) antes de guardar
  const cleanItems = items.map(({ file, previewUrl, blob, pdfFile, fileObject, ...rest }) => {
    const pricing = rest.pricing || getItemPricing(rest);
    return pricing ? { ...rest, pricing } : rest;
  });
  const checkoutClient = createRequestClient(accessToken);
  const authenticatedUserId = accessToken && user?.id ? user.id : null;
  const inferredSubtotal = roundMoney(subtotal) ?? roundMoney(
    cleanItems.reduce((sum, item) => sum + (getItemPricing(item)?.total || 0), 0)
  ) ?? 0;
  const discountAmount = roundMoney(discount) ?? 0;
  const totalAmount = roundMoney(total) ?? Math.max(0, roundMoney(inferredSubtotal - discountAmount) ?? 0);
  const pricingSummary = {
    currency: "MXN",
    subtotal: inferredSubtotal,
    discount: discountAmount,
    total: totalAmount,
    hasUnknownTotal: cleanItems.some((item) => !getItemPricing(item)),
  };

  // El resumen tambien se guarda en notes para mantener compatibilidad con schemas viejos.
  const orderData = {
    user_id:          authenticatedUserId,
    customer_name:    customerName,
    customer_phone:   customerPhone,
    customer_email:   user?.email || null,
    items:            cleanItems,
    notes:            appendOrderDetailsNote(notes, pricingSummary, couponCode, billingInfo),
    payment_method:   paymentMethod,
    payment_status:   "pending",
    status:           "pending_payment",
  };
  const orderDataWithPricing = {
    ...orderData,
    pricing_summary: pricingSummary,
    coupon_code:     couponCode || null,
  };

  // RLS permite al cliente crear su pedido y al admin gestionarlo desde su cuenta.
  const insertOrder = (payload) => withTimeout(
    checkoutClient
      .from("orders")
      .insert(payload)
      .select()
      .single(),
    12000,
    "Supabase no respondio al crear el pedido. Recarga la pagina e intenta de nuevo."
  );
  let { data, error } = await insertOrder(orderDataWithPricing);

  if (error && isMissingOptionalOrderColumn(error)) {
    ({ data, error } = await insertOrder(orderData));
  }

  return {
    data: data
      ? {
          ...data,
          pricing: pricingSummary,
          coupon_code: couponCode || null,
          billing_info: billingInfo || null,
        }
      : data,
    error,
  };
}

// ── Crear checkout de Mercado Pago ───────────────────────────────
export async function createMercadoPagoCheckout({ orderId, accessToken }) {
  if (!orderId) {
    return { data: null, error: new Error("Falta el ID del pedido para crear el pago.") };
  }
  if (!accessToken) {
    return { data: null, error: new Error("Inicia sesion para pagar en linea.") };
  }

  try {
    const response = await withTimeout(
      fetch(`${supabaseUrl}/functions/v1/create-payment`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      }),
      18000,
      "No se pudo conectar con Mercado Pago. Intenta de nuevo."
    );

    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { detail: text };
    }

    if (!response.ok) {
      const message =
        payload.detail ||
        payload.message ||
        payload.error ||
        payload.code ||
        "No se pudo crear el link de pago.";
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      return { data: null, error };
    }

    return { data: payload, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function uploadOrderFiles(orderId, items, { accessToken } = {}) {
  const checkoutClient = createRequestClient(accessToken);
  console.log("[upload] Iniciando subida para orden:", orderId, "| items:", items.length);

  const uploadJobs = items.map(async (item) => {
    const file = item.file || item.pdfFile || item.fileObject || item.blob;
    console.log("[upload] Item:", item.id, "| file:", file ? `${file.name} (${file.size}b)` : "sin archivo");
    if (!file || !(file instanceof File || file instanceof Blob)) return null;

    const originalName = (item.fileName || file.name || "archivo").replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = originalName.split(".").pop() || "pdf";
    const baseName = originalName.replace(/\.[^.]+$/, "").slice(0, 60);
    const itemId = item.id || Math.random().toString(36).slice(2, 10);
    const path = `orders/${orderId}/${itemId}_${baseName}.${ext}`;
    console.log("[upload] Subiendo a path:", path);

    try {
      const { data, error } = await withTimeout(
        checkoutClient.storage
          .from("order-files")
          .upload(path, file, {
            upsert: false,
            contentType: file.type || "application/octet-stream",
            cacheControl: "3600",
          }),
        15000,
        `Supabase no respondio al subir ${originalName}.`
      );

      if (error) {
        console.warn(`[upload] ERROR subiendo ${originalName}:`, error.message);
        return null;
      }

      console.log("[upload] OK:", data.path);
      return {
        itemId: item.id,
        path: data.path,
        originalName,
        size: file.size,
      };
    } catch (error) {
      console.warn(`[upload] TIMEOUT/ERROR subiendo ${originalName}:`, error?.message || error);
      return null;
    }
  });

  const settled = await Promise.allSettled(uploadJobs);
  const results = settled.flatMap((result) => (
    result.status === "fulfilled" && result.value ? [result.value] : []
  ));

  console.log("[upload] Resultados:", results);

  if (results.length > 0) {
    console.log("[upload] Archivos listos en Storage:", results.map((r) => r.path));
  } else {
    console.warn("[upload] Ningún archivo encontrado en los items del carrito.");
  }

  return results;
}

export async function attachOrderFiles(orderId, fileRecords, { accessToken } = {}) {
  const normalized = (Array.isArray(fileRecords) ? fileRecords : [])
    .filter((record) => record?.path)
    .map((record) => ({
      itemId: record.itemId || null,
      path: record.path,
      originalName: record.originalName || null,
      size: record.size || null,
      type: record.type || "order_file",
    }));

  if (!orderId || normalized.length === 0) {
    return { data: null, error: null };
  }

  const filePaths = normalized.map((record) => record.path);
  const client = createSupabaseRequestClient(accessToken);
  try {
    const { data, error } = await withTimeout(
      client
        .from("orders")
        .update({ file_paths: filePaths })
        .eq("id", orderId)
        .select("id, file_paths")
        .single(),
      8000,
      "Supabase no respondio al guardar las rutas de archivos."
    );

    if (error) {
      console.warn("[upload] No se pudieron guardar las rutas en orders.file_paths:", error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.warn("[upload] TIMEOUT/ERROR guardando rutas:", error?.message || error);
    return { data: null, error };
  }
}

// ── Cancelar pedido (usuario) ────────────────────────────────────
export async function cancelOrder(orderId, { accessToken } = {}) {
  const client = createSupabaseRequestClient(accessToken);
  const status = "cancelled";
  const [orderRes, histRes] = await Promise.all([
    client
      .from("orders")
      .update({ status })
      .eq("id", orderId),
    client
      .from("order_status_history")
      .insert({ order_id: orderId, status, message: "Cancelado por el cliente" }),
  ]);
  return { error: orderRes.error || histRes.error };
}

// ── Actualizar estado del pedido (admin) ────────────────────────
export async function updateOrderStatus(orderId, status, message, { accessToken } = {}) {
  const client = createSupabaseRequestClient(accessToken);
  const orderRes = await withTimeout(
    client
      .from("orders")
      .update({ status })
      .eq("id", orderId),
    12000,
    "Supabase no respondio al actualizar el estado. Recarga el panel e intenta de nuevo."
  );

  if (orderRes.error) return { error: orderRes.error };

  const histRes = await withTimeout(
    client
      .from("order_status_history")
      .insert({ order_id: orderId, status, message: message || STATUS_LABELS[status] || status }),
    8000,
    "El estado se actualizo, pero Supabase no respondio al guardar el historial."
  ).catch((error) => ({ error }));

  return {
    data: null,
    error: null,
    warning: histRes.error || null,
  };
}

// ── Obtener pedidos del cliente (con historial) ─────────────────
export async function fetchMyOrders(userId, { accessToken = null, forceRefresh = false } = {}) {
  const run = async (token) => {
    const client = createSupabaseRequestClient(token);
    return client
      .from("orders")
      .select("*, order_status_history(status, message, created_at)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
  };

  let token = await resolveAccessToken({ accessToken, forceRefresh });
  let { data, error } = await run(token);

  if (error && isAuthExpiredError(error)) {
    token = await resolveAccessToken({ accessToken: token, forceRefresh: true });
    ({ data, error } = await run(token));
  }

  return { data, error };
}

// ── Obtener todos los pedidos (admin) ───────────────────────────
export async function fetchAllOrders({ accessToken } = {}) {
  const client = createSupabaseRequestClient(accessToken);
  const { data, error } = await client
    .from("orders")
    .select("*, order_status_history(status, message, created_at)")
    .order("created_at", { ascending: false });
  return { data, error };
}

// ── Suscripción realtime a los pedidos del cliente ───────────────
export function subscribeToMyOrders(userId, callback) {
  const channel = supabase
    .channel(`orders:user:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
      callback
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "order_status_history" },
      callback
    )
    .subscribe();
  return channel;
}

// ── Mensaje de estado para notificar al cliente ─────────────────
export function buildStatusNotificationMessage(order, newStatus) {
  const shortId = String(order.id || "").slice(0, 8).toUpperCase();
  const label = STATUS_LABELS[newStatus] || newStatus;

  const emojis = {
    paid:             "✅",
    payment_approved: "✅",
    in_progress:      "🖨️",
    printing:         "⚙️",
    ready:            "🎉",
    completed:        "✅",
    cancelled:        "❌",
  };

  let msg = `${emojis[newStatus] || "📋"} *Copy Center 2000*\n\n`;
  msg += `Tu pedido *#${shortId}* ha sido actualizado:\n\n`;
  msg += `📊 Estado: *${label}*\n`;

  if (newStatus === "paid") {
    msg += `\nTu pago fue confirmado y ya estamos empezando tu trabajo. Te avisaremos cuando esté listo.`;
  } else if (newStatus === "ready") {
    msg += `\n🗺️ Pasa a recoger tu pedido en nuestro local.\n`;
    msg += `Horario: Lun–Vie 9am–7pm | Sáb 9am–3pm`;
  } else if (newStatus === "in_progress") {
    msg += `\nYa comenzamos a trabajar en tu pedido. Te avisaremos cuando esté listo. 🙌`;
  } else if (newStatus === "printing") {
    msg += `\nEstamos terminando de imprimir tu pedido. ¡Casi listo!`;
  }

  return msg;
}
