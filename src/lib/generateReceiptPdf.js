// src/lib/generateReceiptPdf.js
// Genera el comprobante / nota de pedido en PDF para el cliente.
import jsPDF from "jspdf";
import { getOrderFinancials, formatMoney, STATUS_LABELS } from "./orders";

// Quita acentos para que Helvetica (latin1) los renderice bien
function latin(str = "") {
  return String(str)
    .replace(/[áà]/g, "a").replace(/[éè]/g, "e")
    .replace(/[íì]/g, "i").replace(/[óò]/g, "o")
    .replace(/[úù]/g, "u").replace(/ñ/g, "n")
    .replace(/[ÁÀ]/g, "A").replace(/[ÉÈ]/g, "E")
    .replace(/[ÍÌ]/g, "I").replace(/[ÓÒ]/g, "O")
    .replace(/[ÚÙ]/g, "U").replace(/Ñ/g, "N")
    .replace(/ü/g, "u").replace(/Ü/g, "U");
}

export function generateReceiptPdf(order) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const shortId = String(order.id || "").slice(0, 8).toUpperCase();
  const fecha = new Date(order.created_at).toLocaleString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const financials = getOrderFinancials(order);
  const billing = order.billing_info || null;
  const items = order.items || [];

  const W = 210;
  const MARGIN = 18;
  let y = 0;

  // ── Helpers ────────────────────────────────────────────────────
  function bold(size = 10)   { doc.setFont("helvetica", "bold");   doc.setFontSize(size); }
  function normal(size = 10) { doc.setFont("helvetica", "normal"); doc.setFontSize(size); }
  function italic(size = 9)  { doc.setFont("helvetica", "italic"); doc.setFontSize(size); }
  function rgb(r, g, b)      { doc.setTextColor(r, g, b); }
  function draw(r, g, b)     { doc.setDrawColor(r, g, b); }
  function fill(r, g, b)     { doc.setFillColor(r, g, b); }

  function hline(x1 = MARGIN, x2 = W - MARGIN, thickness = 0.2) {
    doc.setLineWidth(thickness);
    doc.line(x1, y, x2, y);
  }

  function sectionTitle(label) {
    y += 3;
    bold(7);
    rgb(130, 150, 175);
    doc.text(latin(label).toUpperCase(), MARGIN, y);
    draw(200, 215, 230);
    const labelW = doc.getTextWidth(latin(label).toUpperCase()) + 3;
    doc.setLineWidth(0.2);
    doc.line(MARGIN + labelW, y - 1, W - MARGIN, y - 1);
    y += 5;
  }

  // ── HEADER ────────────────────────────────────────────────────
  fill(20, 52, 120);
  doc.rect(0, 0, W, 36, "F");

  // Acento rojo en borde inferior del header
  fill(198, 28, 28);
  doc.rect(0, 34, W, 2, "F");

  bold(17);
  rgb(255, 255, 255);
  doc.text("COPY CENTER 2000", MARGIN, 16);

  normal(9);
  rgb(180, 200, 240);
  doc.text(latin("Comprobante de Pedido"), MARGIN, 24);
  doc.text(latin("Pachuca, Hidalgo, Mexico"), MARGIN, 30);

  // ID y fecha alineados a la derecha
  bold(13);
  rgb(255, 255, 255);
  doc.text(`#${shortId}`, W - MARGIN, 17, { align: "right" });
  normal(8);
  rgb(180, 200, 240);
  doc.text(latin(fecha), W - MARGIN, 25, { align: "right" });

  y = 46;

  // ── DATOS DEL CLIENTE ─────────────────────────────────────────
  sectionTitle("Cliente");

  bold(12);
  rgb(25, 40, 70);
  doc.text(latin(order.customer_name || "Sin nombre"), MARGIN, y);
  y += 6;

  normal(9);
  rgb(70, 90, 120);
  if (order.customer_phone) {
    doc.text(latin(`Tel: ${order.customer_phone}`), MARGIN, y);
    y += 5;
  }
  if (order.customer_email) {
    doc.text(latin(`Email: ${order.customer_email}`), MARGIN, y);
    y += 5;
  }

  const payLabel = order.payment_method === "mercadopago"
    ? "Mercado Pago"
    : order.payment_method === "card"
      ? "Tarjeta"
      : latin("Transferencia bancaria");
  doc.text(latin(`Pago: ${payLabel}`), MARGIN, y);
  y += 5;

  const statusLabel = STATUS_LABELS[order.status] || order.status;
  doc.text(latin(`Estado: ${statusLabel}`), MARGIN, y);
  y += 10;

  // ── SERVICIOS ─────────────────────────────────────────────────
  sectionTitle("Servicios");

  // Cabecera de tabla
  fill(235, 241, 250);
  doc.rect(MARGIN, y - 1, W - MARGIN * 2, 7, "F");
  bold(8);
  rgb(50, 70, 110);
  doc.text("#", MARGIN + 2, y + 4);
  doc.text("Servicio / Archivo", MARGIN + 10, y + 4);
  doc.text("Precio", W - MARGIN - 2, y + 4, { align: "right" });
  y += 9;

  for (const [i, item] of items.entries()) {
    if (y > 255) { doc.addPage(); y = 20; }

    // Fila de servicio
    bold(9);
    rgb(25, 40, 70);
    doc.text(String(i + 1), MARGIN + 2, y);
    doc.text(latin(item.serviceLabel || item.serviceKey || "Servicio"), MARGIN + 10, y);

    // Precio del item
    const pricing = item.pricing;
    if (pricing?.total != null) {
      normal(9);
      rgb(20, 140, 80);
      doc.text(`$${formatMoney(pricing.total)}`, W - MARGIN - 2, y, { align: "right" });
    } else {
      italic(8);
      rgb(130, 150, 175);
      doc.text("por cotizar", W - MARGIN - 2, y, { align: "right" });
    }

    if (item.fileName) {
      y += 4;
      normal(7);
      rgb(120, 140, 170);
      doc.text(latin(`   ${item.fileName}`), MARGIN + 10, y);
    }

    // Separador de fila
    y += 2;
    draw(215, 225, 240);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, y, W - MARGIN, y);
    y += 5;
  }

  // ── TOTALES ───────────────────────────────────────────────────
  y += 2;
  draw(20, 52, 120);
  doc.setLineWidth(0.5);
  doc.line(W - MARGIN - 60, y, W - MARGIN, y);
  y += 7;

  if (financials.discount > 0 || financials.paymentAdjustment?.amount) {
    normal(9);
    rgb(100, 120, 150);
    doc.text(latin("Subtotal:"), W - MARGIN - 58, y);
    doc.text(`$${formatMoney(financials.subtotal)} MXN`, W - MARGIN, y, { align: "right" });
    y += 5;
  }

  if (financials.discount > 0) {
    normal(9);
    rgb(16, 160, 100);
    doc.text(latin("Descuento:"), W - MARGIN - 58, y);
    doc.text(`-$${formatMoney(financials.discount)} MXN`, W - MARGIN, y, { align: "right" });
    y += 5;
  }

  if (financials.paymentAdjustment?.amount) {
    const adjustmentAmount = Number(financials.paymentAdjustment.amount) || 0;
    const isDiscount = adjustmentAmount < 0;
    normal(9);
    rgb(isDiscount ? 16 : 180, isDiscount ? 160 : 120, isDiscount ? 100 : 20);
    doc.text(latin(isDiscount ? "Desc. transferencia:" : "Comision MP:"), W - MARGIN - 58, y);
    doc.text(
      `${isDiscount ? "-" : "+"}$${formatMoney(Math.abs(adjustmentAmount))} MXN`,
      W - MARGIN,
      y,
      { align: "right" }
    );
    y += 5;
  }

  bold(12);
  rgb(25, 40, 70);
  doc.text("TOTAL:", W - MARGIN - 58, y);
  if (financials.hasKnownTotal) {
    rgb(20, 52, 120);
    doc.text(`$${formatMoney(financials.total)} MXN`, W - MARGIN, y, { align: "right" });
  } else {
    rgb(130, 150, 175);
    doc.text("Por cotizar", W - MARGIN, y, { align: "right" });
  }
  y += 12;

  // ── DATOS DE FACTURACION ──────────────────────────────────────
  if (billing?.requiresInvoice) {
    if (y > 240) { doc.addPage(); y = 20; }
    sectionTitle("Datos de Facturacion");

    normal(9);
    rgb(50, 70, 110);
    if (billing.rfc) {
      doc.text(latin(`RFC: ${billing.rfc}`), MARGIN, y); y += 5;
    }
    if (billing.razonSocial) {
      doc.text(latin(`Razon Social: ${billing.razonSocial}`), MARGIN, y); y += 5;
    }
    if (billing.email) {
      doc.text(latin(`Correo: ${billing.email}`), MARGIN, y); y += 5;
    }
    italic(7);
    rgb(140, 160, 190);
    doc.text(latin("La factura sera enviada al correo indicado una vez confirmado el pago."), MARGIN, y);
    y += 10;
  }

  // ── NOTAS ─────────────────────────────────────────────────────
  const cleanNotes = (order.notes || "")
    .split("\n")
    .filter((l) => !l.startsWith("[Resumen de pago]") && !l.startsWith("[Ticket de cobro]"))
    .join("\n")
    .trim();

  if (cleanNotes) {
    if (y > 240) { doc.addPage(); y = 20; }
    sectionTitle(latin("Instrucciones del cliente"));
    normal(9);
    rgb(60, 80, 110);
    const noteLines = doc.splitTextToSize(latin(cleanNotes.slice(0, 400)), W - MARGIN * 2);
    doc.text(noteLines, MARGIN, y);
    y += noteLines.length * 5 + 5;
  }

  // ── FOOTER ────────────────────────────────────────────────────
  const PAGE_H = 297;
  fill(245, 247, 252);
  doc.rect(0, PAGE_H - 18, W, 18, "F");
  draw(210, 220, 235);
  doc.setLineWidth(0.3);
  doc.line(0, PAGE_H - 18, W, PAGE_H - 18);

  normal(7);
  rgb(120, 140, 175);
  doc.text("Copy Center 2000 — Pachuca, Hidalgo", W / 2, PAGE_H - 10, { align: "center" });
  doc.text(
    latin("Este documento es un comprobante de pedido, no una factura fiscal CFDI."),
    W / 2, PAGE_H - 5, { align: "center" }
  );

  doc.save(`comprobante-${shortId}.pdf`);
}
