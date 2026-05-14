// src/lib/orders.js
import { supabase } from "./supabaseClient";

// ── Número WhatsApp del negocio ──────────────────────────────────
export const SHOP_PHONE = "527713531668";

// ── Etiquetas de estado en español ──────────────────────────────
export const STATUS_LABELS = {
  pending_payment:   "Pendiente de pago",
  payment_approved:  "Pago confirmado — En cola",
  in_progress:       "Trabajando en tu pedido",
  printing:          "Terminando de imprimir",
  ready:             "Listo para recoger ✅",
  completed:         "Entregado",
  cancelled:         "Cancelado",
};

export const STATUS_ORDER = [
  "pending_payment",
  "payment_approved",
  "in_progress",
  "printing",
  "ready",
  "completed",
];

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
  const fecha = new Date(order.created_at || Date.now()).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const payLabel =
    order.payment_method === "card"
      ? "💳 Tarjeta — *PAGO APROBADO*"
      : "🏦 Transferencia bancaria — pendiente de comprobante";

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
export async function createOrder({ user, items, customerName, customerPhone, paymentMethod, notes }) {
  // Limpiar File objects (no serializables) antes de guardar
  const cleanItems = items.map(({ file, previewUrl, blob, pdfFile, fileObject, ...rest }) => rest);

  const orderData = {
    user_id:          user?.id || null,
    customer_name:    customerName,
    customer_phone:   customerPhone,
    customer_email:   user?.email || null,
    items:            cleanItems,
    notes:            notes || null,
    payment_method:   paymentMethod,
    payment_status:   paymentMethod === "card" ? "approved" : "pending",
    status:           paymentMethod === "card" ? "payment_approved" : "pending_payment",
  };

  const { data, error } = await supabase
    .from("orders")
    .insert(orderData)
    .select()
    .single();

  return { data, error };
}

// ── Subir archivos del pedido a Storage ─────────────────────────
export async function uploadOrderFiles(orderId, items) {
  const results = [];
  for (const item of items) {
    const file = item.file || item.pdfFile || item.fileObject || item.blob;
    if (!file || !(file instanceof File || file instanceof Blob)) continue;

    const ext = item.ext || (file.name ? file.name.split(".").pop() : "pdf");
    const path = `orders/${orderId}/${item.id || Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("order-files")
      .upload(path, file, { upsert: true });

    if (!error) results.push({ itemId: item.id, path });
  }
  return results;
}

// ── Actualizar estado del pedido (admin) ────────────────────────
export async function updateOrderStatus(orderId, status, message) {
  const [orderRes, histRes] = await Promise.all([
    supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId),
    supabase
      .from("order_status_history")
      .insert({ order_id: orderId, status, message: message || STATUS_LABELS[status] || status }),
  ]);
  return { error: orderRes.error || histRes.error };
}

// ── Obtener pedidos del cliente (con historial) ─────────────────
export async function fetchMyOrders(userId) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_status_history(status, message, created_at)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data, error };
}

// ── Obtener todos los pedidos (admin) ───────────────────────────
export async function fetchAllOrders() {
  const { data, error } = await supabase
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

  if (newStatus === "ready") {
    msg += `\n🗺️ Pasa a recoger tu pedido en nuestro local.\n`;
    msg += `Horario: Lun–Vie 9am–7pm | Sáb 9am–3pm`;
  } else if (newStatus === "in_progress") {
    msg += `\nYa comenzamos a trabajar en tu pedido. Te avisaremos cuando esté listo. 🙌`;
  } else if (newStatus === "printing") {
    msg += `\nEstamos terminando de imprimir tu pedido. ¡Casi listo!`;
  }

  return msg;
}
