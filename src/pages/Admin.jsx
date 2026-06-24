// src/pages/Admin.jsx — Dashboard Admin rediseñado
import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { supabase } from "../lib/supabaseClient";
import { useIsAdmin } from "../lib/useIsAdmin";
import {
  fetchAllOrders,
  updateOrderStatus,
  buildStatusNotificationMessage,
  buildOrderWhatsAppMessage,
  openWhatsApp,
  STATUS_LABELS,
  STATUS_ORDER,
  createSupabaseRequestClient,
  isPaymentConfirmed,
  getOrderFinancials,
  getItemPricing,
  formatMoney,
} from "../lib/orders";
import { fmtOptionsAdmin } from "../lib/orderOptions";
import { createCopyTicket, listRecentCopyTickets } from "../lib/copyTickets";

// ── Assets de servicios ────────────────────────────────────────────────────────
import digi      from "@/assets/digi.webp";
import engar     from "@/assets/engar.webp";
import planos    from "@/assets/planos.webp";
import artes     from "@/assets/artes.webp";
import stickers  from "@/assets/stickers.webp";
import pvcImg    from "@/assets/pvc.webp";
import subliImg  from "@/assets/sublimacion.webp";
import scanImg   from "@/assets/scan.webp";
import pinsImg   from "@/assets/pins.webp";

const IMG_MAP = {
  impresion: digi, copias: engar, engargolado: engar, ploteo: planos, artes, stickers,
  pvc: pvcImg, sublimacion: subliImg, fotobotones: pinsImg, escaneo: scanImg,
  actas: scanImg,
  "constancia-situacion-fiscal": scanImg,
};

const LEGACY_ADMIN_ACTA_KEYS = new Set([
  "acta-nacimiento",
  "acta-matrimonio",
  "acta-defuncion",
]);

const REQUIRED_ADMIN_SERVICES = [
  { id: "copias", nombre: "Copias", tag: "OFICINA", descripcion: "Copias rápidas y nítidas en blanco y negro o color, a una o dos caras.", desde_precio: "Desde $0.70/copia", activo: true, orden: 2, requiere_archivo: false },
  { id: "engargolado", nombre: "Engargolados", tag: "ACABADOS", descripcion: "Engargolado metálico o plástico para tareas, manuales, informes y presentaciones.", desde_precio: "Desde $22", activo: true, orden: 3, requiere_archivo: false },
  { id: "actas", nombre: "Actas", tag: "TRÁMITES", descripcion: "Actas de nacimiento, matrimonio o defunción. El cliente selecciona el tipo al configurar.", desde_precio: "$85", activo: true, orden: 4, requiere_archivo: false },
  { id: "constancia-situacion-fiscal", nombre: "Constancia de situación fiscal", tag: "SAT", descripcion: "Obtén tu constancia proporcionando RFC e ID de CIF.", desde_precio: "$120", activo: true, orden: 5, requiere_archivo: false },
];

function mergeAdminServices(remoteServices = []) {
  const remoteById = new Map(
    remoteServices
      .filter((service) => !LEGACY_ADMIN_ACTA_KEYS.has(service.id))
      .map((service) => {
      const id = service.id === "copias-engargolados" ? "copias" : service.id;
      return [id, { ...service, id, _catalogOnly: false }];
      })
  );

  const required = REQUIRED_ADMIN_SERVICES.map((catalogService) => {
    const remote = remoteById.get(catalogService.id);
    remoteById.delete(catalogService.id);
    if (!remote) return { ...catalogService, _catalogOnly: true };
    if (catalogService.id === "copias" && /engargol/i.test(remote.nombre || "")) {
      return { ...remote, ...catalogService, activo: remote.activo !== false, _catalogOnly: false };
    }
    return remote;
  });

  return [...required, ...remoteById.values()].sort(
    (a, b) => Number(a.orden ?? 999) - Number(b.orden ?? 999)
  );
}

function serviceDatabasePayload(service, overrides = {}) {
  return {
    id: service.id,
    nombre: service.nombre,
    descripcion: service.descripcion,
    tag: service.tag,
    desde_precio: service.desde_precio,
    activo: service.activo !== false,
    orden: service.orden,
    requiere_archivo: Boolean(service.requiere_archivo),
    suspendido_msg: service.suspendido_msg || null,
    ...overrides,
  };
}

// ── Constantes de color por estado ────────────────────────────────────────────
const STATUS_COLORS = {
  pending_payment:  "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
  paid:             "bg-blue-500/20 text-blue-300 border-blue-400/30",
  payment_approved: "bg-blue-500/20 text-blue-300 border-blue-400/30",
  in_progress:      "bg-orange-500/20 text-orange-300 border-orange-400/30",
  printing:         "bg-purple-500/20 text-purple-300 border-purple-400/30",
  ready:            "bg-green-500/20 text-green-300 border-green-400/30",
  completed:        "bg-slate-500/20 text-slate-300 border-slate-400/30",
  cancelled:        "bg-red-500/20 text-red-300 border-red-400/30",
};

const STATUS_ICONS = {
  pending_payment: "⏳", paid: "✅", payment_approved: "✅", in_progress: "🖨️",
  printing: "⚙️", ready: "🎉", completed: "📦", cancelled: "❌",
};

const ALL_STATUSES = [...STATUS_ORDER, "cancelled"];

function orderTotalLabel(order) {
  const money = getOrderFinancials(order);
  return money.hasKnownTotal && money.total > 0 ? `$${formatMoney(money.total)}` : "Por cotizar";
}

function paymentMethodLabel(order) {
  if (order.payment_method === "mercadopago") return "Mercado Pago";
  if (order.payment_method === "card") return "Tarjeta";
  return "Transferencia";
}

function paymentMethodIcon(order) {
  if (order.payment_method === "mercadopago") return "💳";
  if (order.payment_method === "card") return "💳";
  return "🏦";
}

function canConfirmManualPayment(order) {
  return ["transfer", "card"].includes(order.payment_method) && !isPaymentConfirmed(order);
}

function paidOrdersRevenue(orders) {
  return orders
    .filter((order) => order.status !== "cancelled" && isPaymentConfirmed(order))
    .reduce((sum, order) => sum + getOrderFinancials(order).total, 0);
}

function jwtExpiresSoon(token, skewSeconds = 60) {
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

function isAuthExpiredError(error) {
  const msg = String(error?.message || error?.error_description || error || "").toLowerCase();
  return error?.status === 401 || msg.includes("jwt") || msg.includes("expired") || msg.includes("exp claim");
}

// ── Helpers de archivos ────────────────────────────────────────────────────────
async function getSignedUrl(path, accessToken) {
  const client = createSupabaseRequestClient(accessToken);
  const { data, error } = await client.storage
    .from("order-files").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

function safeDownloadName(name = "archivo") {
  let cleanName = name;
  try {
    cleanName = decodeURIComponent(cleanName);
  } catch {
    cleanName = name;
  }
  return cleanName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_") || "archivo";
}

function fileIcon(name = "") {
  const ext = name.split(".").pop().toLowerCase();
  if (["jpg","jpeg","png","webp","gif"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📄";
  if (["dwg","dxf","dwf","plt"].includes(ext)) return "📐";
  return "📎";
}
const isImage = (n="") => /\.(jpe?g|png|webp|gif)$/i.test(n);
const isPdf   = (n="") => /\.pdf$/i.test(n);

// ── Relaciona file_paths con items ────────────────────────────────────────────
function matchFilesToItems(items, filePaths) {
  return (items || []).map((item) => {
    const matched = (filePaths || []).find((p) =>
      p.split("/").pop().startsWith((item.id || "") + "_")
    );
    return { item, filePath: matched || null };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: Ficha de un item (servicio + archivo + specs)
// ─────────────────────────────────────────────────────────────────────────────
function ItemCard({ item, filePath, accessToken, getAccessToken }) {
  const [url, setUrl]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [preview, setPreview] = useState(false);
  const fileName = filePath ? filePath.split("/").pop() : (item.fileName || "");
  const rows = fmtOptionsAdmin(item);
  const pricing = getItemPricing(item);

  async function fetchUrl() {
    if (url) { setPreview(p => !p); return; }
    setLoading(true);
    const token = await getAccessToken?.() || accessToken;
    const signed = await getSignedUrl(filePath, token);
    setUrl(signed);
    setLoading(false);
    if (signed) setPreview(true);
  }

  async function downloadFile() {
    if (!filePath) return;
    setDownloading(true);
    try {
      const token = await getAccessToken?.({ forceRefresh: true }) || accessToken;
      const client = createSupabaseRequestClient(token);
      const { data, error } = await client.storage
        .from("order-files")
        .download(filePath);
      if (error) throw error;

      const objectUrl = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = safeDownloadName(item.fileName || fileName || "archivo");
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      console.error("[Admin] Error al descargar archivo:", err);
      alert("No se pudo descargar el archivo. Intenta de nuevo.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Cabecera del item */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">{item.serviceLabel || item.serviceKey}</p>
          {pricing && (
            <p className="text-green-300 text-xs font-semibold tabular-nums mt-0.5">
              ${formatMoney(pricing.total)} {pricing.label ? <span className="text-slate-500 font-normal">· {pricing.label}</span> : null}
            </p>
          )}
          {fileName && (
            <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
              {fileIcon(fileName)} {fileName}
              {item.fileName && !filePath && (
                <span className="text-yellow-500 ml-1 text-[10px]">(pendiente de subir)</span>
              )}
            </p>
          )}
        </div>
        {filePath && (
          <div className="flex gap-1.5 shrink-0">
            {(isImage(fileName) || isPdf(fileName)) && (
              <button onClick={fetchUrl} disabled={loading}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-400/20 text-blue-300 hover:bg-blue-500/25 transition disabled:opacity-50">
                {loading ? "…" : preview ? "Ocultar" : isPdf(fileName) ? "Ver PDF" : "Ver imagen"}
              </button>
            )}
            <button onClick={downloadFile} disabled={downloading}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-slate-300 hover:bg-white/15 transition disabled:opacity-50">
              {downloading ? "…" : "⬇ Descargar"}
            </button>
          </div>
        )}
        {!filePath && item.fileName && (
          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-yellow-500/15 border border-yellow-400/20 text-yellow-400">
            ⏳ Sin subir
          </span>
        )}
      </div>

      {/* Preview inline */}
      {preview && url && (
        <div className="bg-black/40 flex justify-center p-3 border-b border-white/5">
          {isImage(fileName)
            ? <img src={url} alt={fileName} className="max-h-56 max-w-full rounded-lg object-contain cursor-zoom-in" onClick={() => window.open(url, "_blank")} />
            : <iframe src={url} title={fileName} className="w-full rounded-lg border border-white/10" style={{ height: 320 }} />
          }
        </div>
      )}

      {/* Especificaciones */}
      {rows.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">Especificaciones</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {rows.map(({ label, value }) => (
              <div key={label} className="flex items-baseline gap-1 text-[12px]">
                <span className="text-slate-500 shrink-0">{label}:</span>
                <span className="text-slate-200 font-medium truncate">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {rows.length === 0 && Object.keys(item.options || {}).length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">Opciones</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(item.options || {})
              .filter(([,v]) => v !== "" && v !== null && v !== undefined && v !== false)
              .map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-1 text-[12px]">
                  <span className="text-slate-500 shrink-0">{k}:</span>
                  <span className="text-slate-200 font-medium truncate">
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: Panel lateral de detalle de pedido
// ─────────────────────────────────────────────────────────────────────────────
function OrderDetailPanel({ order, onClose, onStatusChange, accessToken, getAccessToken }) {
  const [updating, setUpdating]   = useState(false);
  const [note, setNote]           = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [storageFilePaths, setStorageFilePaths] = useState([]);

  useEffect(() => {
    let alive = true;
    if (!order?.id) {
      setStorageFilePaths([]);
      return () => { alive = false; };
    }
    const known = Array.isArray(order.file_paths) ? order.file_paths : [];
    setStorageFilePaths(known);

    async function loadStorageFiles() {
      if (!order.id || known.length > 0) return;
      const token = await getAccessToken?.() || accessToken;
      const client = createSupabaseRequestClient(token);
      const { data, error } = await client.storage
        .from("order-files")
        .list(`orders/${order.id}`, {
          limit: 100,
          sortBy: { column: "name", order: "asc" },
        });
      if (!alive) return;
      if (error) {
        console.warn("[Admin] No se pudieron listar archivos del pedido:", error.message);
        return;
      }
      setStorageFilePaths(
        (data || [])
          .filter((file) => file?.name && !file.name.endsWith("/"))
          .map((file) => `orders/${order.id}/${file.name}`)
      );
    }

    loadStorageFiles();
    return () => { alive = false; };
  }, [order?.id, accessToken, getAccessToken]);

  if (!order) return null;

  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const fecha = new Date(order.created_at).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const history = (order.order_status_history || []).slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const nextStatus = STATUS_ORDER[STATUS_ORDER.indexOf(order.status) + 1];
  const usedStatuses = new Set((order.order_status_history || []).map(h => h.status));
  const financials = getOrderFinancials(order);

  function buildLocalStatusOrder(newStatus, statusNote) {
    return {
      ...order,
      status: newStatus,
      order_status_history: [
        ...(order.order_status_history || []),
        {
          status: newStatus,
          message: statusNote || STATUS_LABELS[newStatus] || newStatus,
          created_at: new Date().toISOString(),
        },
      ],
    };
  }

  async function handleSetStatus(newStatus) {
    const statusNote = note || STATUS_LABELS[newStatus] || newStatus;
    try {
      setUpdating(true);
      const token = await getAccessToken?.() || accessToken;
      if (!token) throw new Error("Sesion expirada. Vuelve a iniciar sesion.");

      const { error, warning } = await updateOrderStatus(order.id, newStatus, statusNote, { accessToken: token });
      if (error) throw error;
      if (warning) console.warn("[Admin] Estado actualizado, pero no se guardo historial:", warning.message);

      setConfirmId(null);
      setNote("");
      onStatusChange(buildLocalStatusOrder(newStatus, statusNote));
    } catch (err) {
      alert("Error: " + (err.message || "No se pudo actualizar el pedido."));
    } finally {
      setUpdating(false);
    }
  }

  function notifyWA() {
    const msg = buildStatusNotificationMessage(order, order.status);
    const cleaned = (order.customer_phone || "").replace(/\D/g, "");
    openWhatsApp(cleaned.length === 10 ? `52${cleaned}` : cleaned, msg);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay oscuro */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel derecho */}
      <div className="w-full max-w-2xl bg-slate-900 border-l border-white/10 overflow-y-auto flex flex-col">

        {/* Header del panel */}
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Pedido #{shortId}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{fecha}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[order.status] || ""}`}>
              {STATUS_ICONS[order.status]} {STATUS_LABELS[order.status] || order.status}
            </span>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition text-sm">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-6">

          {/* Info del cliente */}
          <section>
            <h3 className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">Cliente</h3>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-300 font-bold text-sm shrink-0">
                  {(order.customer_name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{order.customer_name || "Sin nombre"}</p>
                  <p className="text-slate-400 text-xs">{order.customer_email || ""}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                {order.customer_phone && (
                  <a href={`tel:${order.customer_phone}`}
                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition">
                    📱 {order.customer_phone}
                  </a>
                )}
                <span className="text-xs text-slate-400">
                  {paymentMethodIcon(order)} {paymentMethodLabel(order)}
                  {" — "}
                  {isPaymentConfirmed(order)
                    ? <span className="text-green-400">Pago confirmado</span>
                    : <span className="text-yellow-400">Pago pendiente</span>
                  }
                </span>
              </div>
              {order.notes && (
                <div className="mt-2 bg-white/5 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-slate-500 mb-0.5">Instrucciones</p>
                  <p className="text-sm text-slate-200">{order.notes}</p>
                </div>
              )}
            </div>
          </section>

          {/* Pago y total */}
          <section>
            <h3 className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">Pago y total</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-2xl bg-green-500/10 border border-green-400/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-green-300/70">Total pedido</p>
                <p className="text-lg font-bold text-green-300 tabular-nums">
                  {financials.hasKnownTotal ? `$${formatMoney(financials.total)}` : "Por cotizar"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Subtotal</p>
                <p className="text-sm font-semibold text-slate-200 tabular-nums">${formatMoney(financials.subtotal)}</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Descuento</p>
                <p className="text-sm font-semibold text-slate-200 tabular-nums">${formatMoney(financials.discount)}</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Ganancia</p>
                <p className={`text-sm font-semibold tabular-nums ${isPaymentConfirmed(order) ? "text-green-300" : "text-yellow-300"}`}>
                  {isPaymentConfirmed(order) && financials.hasKnownTotal ? `$${formatMoney(financials.total)}` : "Pendiente"}
                </p>
              </div>
            </div>
          </section>

          {/* Acciones de estado */}
          <section>
            <h3 className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">Gestión del pedido</h3>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">

              {/* Botón de siguiente estado */}
              {nextStatus && !usedStatuses.has(nextStatus) && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Siguiente paso:</p>
                  {confirmId === "next" ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleSetStatus(nextStatus)} disabled={updating}
                        className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-semibold transition">
                        {updating ? "Actualizando…" : `✓ Confirmar: ${STATUS_LABELS[nextStatus]}`}
                      </button>
                      <button onClick={() => setConfirmId(null)} disabled={updating}
                        className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-sm transition">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId("next")}
                      className="w-full py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/30 text-orange-300 text-sm font-semibold transition">
                      → Pasar a: {STATUS_LABELS[nextStatus]}
                    </button>
                  )}
                </div>
              )}

              {/* Confirmar pago de transferencia */}
              {canConfirmManualPayment(order) && (
                <div className="rounded-xl bg-yellow-900/30 border border-yellow-400/20 p-3">
                  <p className="text-yellow-200 text-sm font-medium mb-2">⚠️ Pago sin confirmar</p>
                  <button disabled={updating}
                    onClick={async () => {
                      const statusNote = "Pago confirmado, empezando trabajo";
                      try {
                        setUpdating(true);
                        const token = await getAccessToken?.() || accessToken;
                        if (!token) throw new Error("Sesion expirada. Vuelve a iniciar sesion.");

                        const statusRes = await updateOrderStatus(order.id, "paid", statusNote, { accessToken: token });
                        if (statusRes.error) throw statusRes.error;
                        if (statusRes.warning) {
                          console.warn("[Admin] Estado actualizado, pero no se guardo historial:", statusRes.warning.message);
                        }
                        onStatusChange(buildLocalStatusOrder("paid", statusNote));
                      } catch (err) {
                        alert("Error: " + (err.message || "No se pudo actualizar el pedido."));
                      } finally {
                        setUpdating(false);
                      }
                    }}
                    className="w-full py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black text-sm font-semibold transition">
                    ✅ Confirmar pago y empezar trabajo
                  </button>
                </div>
              )}

              {/* Nota y cambio manual */}
              <div>
                <p className="text-xs text-slate-400 mb-2">Cambiar estado manualmente:</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ALL_STATUSES.map((s) => {
                    const isCurrent = s === order.status;
                    const alreadyUsed = !isCurrent && usedStatuses.has(s);
                    return (
                      <button key={s} disabled={isCurrent || alreadyUsed || updating}
                        onClick={() => handleSetStatus(s)}
                        title={alreadyUsed ? "Este estado ya fue registrado" : undefined}
                        className={`px-3 py-1 rounded-xl text-xs font-medium border transition disabled:opacity-40 ${
                          isCurrent
                            ? "border-orange-400 text-orange-300 bg-orange-500/20"
                            : alreadyUsed
                            ? "border-white/10 text-slate-600 bg-white/5 cursor-not-allowed"
                            : "border-white/15 text-slate-400 bg-white/5 hover:bg-white/10"}`}>
                        {STATUS_ICONS[s]} {STATUS_LABELS[s]}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Mensaje para el historial (opcional)"
                  className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-3 py-1.5 text-xs outline-none focus:border-orange-400"
                />
              </div>

              {/* Notificar por WhatsApp */}
              {order.customer_phone && (
                <button onClick={notifyWA}
                  className="w-full py-2 rounded-xl bg-green-600/15 hover:bg-green-600/25 border border-green-400/30 text-green-300 text-sm font-medium transition">
                  💬 Notificar estado al cliente por WhatsApp
                </button>
              )}
            </div>
          </section>

          {/* Servicios y archivos */}
          <section>
            <h3 className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">
              Servicios solicitados
              <span className="ml-2 normal-case text-slate-600">({(order.items || []).length} item{(order.items || []).length !== 1 ? "s" : ""})</span>
            </h3>

            {(!order.items || order.items.length === 0) ? (
              <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-4 py-3 text-sm text-red-300">
                ⚠️ No hay items registrados en este pedido.
              </div>
            ) : (
              <div className="space-y-3">
                {matchFilesToItems(order.items, storageFilePaths).map(({ item, filePath }, i) => (
                  <ItemCard key={item.id || i} item={item} filePath={filePath} accessToken={accessToken} getAccessToken={getAccessToken} />
                ))}
              </div>
            )}

            {order.items?.length > 0 && storageFilePaths.length === 0 && (
              <p className="text-[11px] text-yellow-500/70 mt-2">
                ⚠️ No hay archivos subidos para este pedido.
              </p>
            )}
          </section>

          {/* Historial */}
          {history.length > 0 && (
            <section>
              <h3 className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">Historial de estados</h3>
              <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 space-y-2">
                {history.map((h) => {
                  const hf = new Date(h.created_at).toLocaleString("es-MX", {
                    day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"
                  });
                  return (
                    <div key={h.id || h.created_at} className="flex items-start gap-3 text-xs">
                      <span className="text-slate-600 shrink-0 tabular-nums">{hf}</span>
                      <span className="text-slate-300">
                        {STATUS_ICONS[h.status] || "●"} {STATUS_LABELS[h.status] || h.status}
                        {h.message && h.message !== (STATUS_LABELS[h.status] || "") && (
                          <span className="text-slate-500"> — {h.message}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: Fila de pedido en la tabla
// ─────────────────────────────────────────────────────────────────────────────
function OrderRow({ order, onSelect }) {
  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const fecha = new Date(order.created_at).toLocaleString("es-MX", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
  const nextStatus = STATUS_ORDER[STATUS_ORDER.indexOf(order.status) + 1];
  const financials = getOrderFinancials(order);

  return (
    <div
      onClick={() => onSelect(order)}
      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition border-b border-white/5 last:border-0 group"
    >
      {/* ID + fecha */}
      <div className="w-24 shrink-0">
        <p className="text-white text-sm font-mono font-semibold">#{shortId}</p>
        <p className="text-slate-500 text-[11px]">{fecha}</p>
      </div>

      {/* Cliente */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{order.customer_name || "Sin nombre"}</p>
        <p className="text-slate-500 text-[11px] truncate">{order.customer_phone || order.customer_email || "—"}</p>
      </div>

      {/* Servicios */}
      <div className="hidden sm:flex flex-col min-w-0 w-40">
        <p className="text-slate-300 text-xs truncate">
          {(order.items || []).map(it => it.serviceLabel || it.serviceKey).join(", ") || "—"}
        </p>
        <p className="text-slate-600 text-[10px]">{(order.items || []).length} servicio(s)</p>
      </div>

      {/* Pago */}
      <div className="hidden md:block shrink-0 w-32 text-center">
        <p className={`text-xs font-semibold tabular-nums ${financials.hasKnownTotal ? "text-green-300" : "text-slate-500"}`}>
          {orderTotalLabel(order)}
        </p>
        <p className="text-xs text-slate-400">
          {paymentMethodIcon(order)}
        </p>
        <p className={`text-[10px] font-medium ${isPaymentConfirmed(order) ? "text-green-400" : "text-yellow-400"}`}>
          {isPaymentConfirmed(order) ? "Pagado" : "Pendiente"}
        </p>
      </div>

      {/* Estado */}
      <div className="shrink-0">
        <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-medium whitespace-nowrap ${STATUS_COLORS[order.status] || ""}`}>
          {STATUS_ICONS[order.status]} {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      {/* Flecha */}
      <div className="shrink-0 text-slate-600 group-hover:text-slate-400 transition text-sm">›</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: Tab de Pedidos
// ─────────────────────────────────────────────────────────────────────────────
function PedidosTab({ orders, loading, onRefresh, accessToken, getAccessToken, onOrderPatch }) {
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState(null);

  // Actualiza el pedido seleccionado cuando llegan nuevos datos
  useEffect(() => {
    if (selected) {
      const updated = orders.find(o => o.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [orders]);

  function handlePanelStatusChange(updatedOrder) {
    if (updatedOrder?.id) {
      setSelected(updatedOrder);
      onOrderPatch?.(updatedOrder);
      if (filter !== "all" && updatedOrder.status && updatedOrder.status !== filter) {
        setFilter(updatedOrder.status);
      }
    }
    onRefresh();
  }

  const filtered = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        String(o.id).toLowerCase().includes(q) ||
        (o.customer_name || "").toLowerCase().includes(q) ||
        (o.customer_phone || "").includes(q) ||
        (o.customer_email || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const filterTabs = [
    { value: "all",             label: "Todos",           count: orders.length },
    { value: "pending_payment", label: "Sin pago",        count: counts["pending_payment"] || 0 },
    { value: "paid",            label: "Empezando trabajo", count: counts["paid"] || 0 },
    { value: "ready",           label: "Listos",          count: counts["ready"] || 0 },
    { value: "cancelled",       label: "Cancelados",      count: counts["cancelled"] || 0 },
  ];

  return (
    <>
      {/* Buscador */}
      <div className="mb-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono, email o ID…"
            className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-orange-400 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Filtros por estado */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {filterTabs.map((t) => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
              filter === t.value
                ? "bg-orange-500/20 border-orange-400/50 text-orange-300"
                : "bg-white/5 border-white/15 text-slate-400 hover:bg-white/10"
            }`}>
            {t.label}
            {t.count > 0 && <span className="ml-1.5 opacity-70">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Tabla de pedidos */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {/* Encabezado */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border-b border-white/10">
          <div className="w-24 shrink-0 text-[10px] uppercase tracking-wider text-slate-600">ID / Fecha</div>
          <div className="flex-1 text-[10px] uppercase tracking-wider text-slate-600">Cliente</div>
          <div className="hidden sm:block w-40 text-[10px] uppercase tracking-wider text-slate-600">Servicios</div>
          <div className="hidden md:block w-32 text-center text-[10px] uppercase tracking-wider text-slate-600">Total / Pago</div>
          <div className="shrink-0 text-[10px] uppercase tracking-wider text-slate-600">Estado</div>
          <div className="w-4 shrink-0" />
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-slate-400 px-4 py-8">
            <div className="w-4 h-4 border-2 border-white/20 border-t-orange-400 rounded-full animate-spin" />
            <span className="text-sm">Cargando pedidos…</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-slate-300 font-medium">
              {orders.length === 0 ? "No hay pedidos aún" : "Sin resultados para ese filtro"}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              {orders.length === 0
                ? "Cuando un cliente haga un pedido, aparecerá aquí."
                : "Prueba cambiando los filtros de búsqueda."}
            </p>
          </div>
        )}

        {!loading && filtered.map((order) => (
          <OrderRow key={order.id} order={order} onSelect={setSelected} />
        ))}
      </div>

      {filtered.length > 0 && (
        <p className="text-center text-xs text-slate-600 mt-3">
          {filtered.length === orders.length
            ? `${orders.length} pedido${orders.length !== 1 ? "s" : ""} en total`
            : `${filtered.length} de ${orders.length} pedidos`}
        </p>
      )}

      {/* Panel de detalle */}
      {selected && (
        <OrderDetailPanel
          order={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handlePanelStatusChange}
          accessToken={accessToken}
          getAccessToken={getAccessToken}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de servicios de mostrador con precios por volumen
// ─────────────────────────────────────────────────────────────────────────────
const SERVICIOS_TICKET = [
  {
    key: "copias_bn_carta",
    label: "Copias B/N — Carta",
    icon: "🖨️",
    unit: "hoja",
    tiers: [
      { min: 1,    max: 99,        price: 1.20 },
      { min: 100,  max: 499,       price: 1.10 },
      { min: 500,  max: 999,       price: 1.00 },
      { min: 1000, max: Infinity,  price: 0.70 },
    ],
  },
  {
    key: "copias_bn_oficio",
    label: "Copias B/N — Oficio",
    icon: "🖨️",
    unit: "hoja",
    tiers: [
      { min: 1,    max: 99,        price: 1.92 },
      { min: 100,  max: 499,       price: 1.68 },
      { min: 500,  max: 999,       price: 1.36 },
      { min: 1000, max: Infinity,  price: 1.20 },
    ],
  },
  {
    key: "copias_bn_doblecarta",
    label: "Copias B/N — Doble carta",
    icon: "🖨️",
    unit: "hoja",
    tiers: [
      { min: 1,    max: 99,        price: 2.72 },
      { min: 100,  max: 499,       price: 2.48 },
      { min: 500,  max: 999,       price: 2.16 },
      { min: 1000, max: Infinity,  price: 2.00 },
    ],
  },
  {
    key: "escaneo_carta",
    label: "Escaneo — Carta / Oficio",
    icon: "📷",
    unit: "hoja",
    tiers: [
      { min: 1,  max: 10,       price: 5.00 },
      { min: 11, max: 50,       price: 4.00 },
      { min: 51, max: Infinity, price: 3.00 },
    ],
  },
  {
    key: "escaneo_tabloide",
    label: "Escaneo — Tabloide / A3",
    icon: "📷",
    unit: "hoja",
    tiers: [
      { min: 1,  max: 10,       price: 8.00 },
      { min: 11, max: 50,       price: 6.00 },
      { min: 51, max: Infinity, price: 5.00 },
    ],
  },
  {
    key: "engargolado_chico",
    label: "Engargolado — Hasta 100 hojas",
    icon: "📚",
    unit: "pieza",
    tiers: [{ min: 1, max: Infinity, price: 20.00 }],
  },
  {
    key: "engargolado_grande",
    label: "Engargolado — 101–300 hojas",
    icon: "📚",
    unit: "pieza",
    tiers: [{ min: 1, max: Infinity, price: 30.00 }],
  },
];

function getUnitPrice(svc, qty) {
  if (!svc || qty <= 0) return 0;
  const tier = svc.tiers.find(t => qty >= t.min && qty <= t.max);
  return tier ? tier.price : svc.tiers[svc.tiers.length - 1].price;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: Formulario de ticket en mostrador
// ─────────────────────────────────────────────────────────────────────────────
function CopyTicketForm({ onCreated }) {
  const [svcKey, setSvcKey]         = useState(SERVICIOS_TICKET[0].key);
  const [qty, setQty]               = useState(1);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [ticket, setTicket]         = useState(null); // { code, label, qty, unitPrice, total }
  const [copied, setCopied]         = useState(false);

  const svc        = SERVICIOS_TICKET.find(s => s.key === svcKey);
  const unitPrice  = getUnitPrice(svc, qty);
  const total      = parseFloat((unitPrice * qty).toFixed(2));
  const qtyValid   = Number.isInteger(qty) && qty >= 1;

  function reset() {
    setTicket(null); setError(""); setCopied(false);
  }

  async function generate() {
    if (!qtyValid) return;
    setLoading(true); setError(""); setTicket(null);
    const meta = {
      servicio: svc.label,
      descripcion: `${qty} ${svc.unit}${qty !== 1 ? "s" : ""} · $${formatMoney(unitPrice)} c/u`,
      cantidad: qty,
      precio_unit: unitPrice,
      total,
    };
    const { code, error: err } = await createCopyTicket(meta);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setTicket({ code, label: svc.label, qty, unitPrice, total });
    onCreated?.();
    setCopied(false);
  }

  function copyToClipboard() {
    if (!ticket) return;
    navigator.clipboard.writeText(ticket.code).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  // Muestra el ticket generado
  if (ticket) {
    return (
      <div className="rounded-2xl border border-blue-400/20 bg-blue-500/5 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-blue-300">🎫 Ticket generado</h2>
          <button onClick={reset} className="text-xs text-slate-400 hover:text-white transition">
            + Nuevo ticket
          </button>
        </div>

        {/* Código grande */}
        <div className="bg-black/30 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Código de pago</p>
            <span className="text-4xl font-mono font-bold tracking-[0.35em] text-white select-all">
              {ticket.code}
            </span>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={copyToClipboard}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-300 transition">
                {copied ? "✓ Copiado" : "Copiar código"}
              </button>
              <span className="text-[11px] text-yellow-300 bg-yellow-500/10 border border-yellow-400/20 px-2.5 py-1 rounded-xl">
                ⚠️ Uso único · 4 h
              </span>
            </div>
          </div>

          {/* Resumen del cobro */}
          <div className="shrink-0 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-right min-w-[150px]">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Total a cobrar</p>
            <p className="text-2xl font-bold text-green-300 tabular-nums">${formatMoney(ticket.total)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{ticket.label}</p>
            <p className="text-[11px] text-slate-500">
              {ticket.qty} {ticket.qty !== 1 ? svc?.unit + "s" : svc?.unit} · ${formatMoney(ticket.unitPrice)} c/u
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 text-center">
          Dale este código al cliente para que pague en la página.
        </p>
      </div>
    );
  }

  // Formulario de selección
  return (
    <div className="rounded-2xl border border-blue-400/20 bg-blue-500/5 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-blue-300">🎫 Generar ticket de cobro en mostrador</h2>
        <p className="text-xs text-slate-400 mt-1">
          Selecciona el servicio y la cantidad — el sistema calcula el total y genera un código de pago único.
        </p>
      </div>

      {/* Selector de servicio */}
      <div>
        <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-2">Servicio</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SERVICIOS_TICKET.map(s => (
            <button key={s.key} type="button" onClick={() => { setSvcKey(s.key); setQty(1); reset(); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-xs font-medium transition ${
                svcKey === s.key
                  ? "border-blue-400/60 bg-blue-500/20 text-blue-200"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}>
              <span className="text-base shrink-0">{s.icon}</span>
              <span className="leading-tight">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cantidad */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-2">
            Cantidad ({svc?.unit}s)
          </label>
          <input
            type="number" min={1} step={1} value={qty}
            onChange={e => { const v = parseInt(e.target.value, 10); setQty(isNaN(v) ? 1 : Math.max(1, v)); reset(); }}
            className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-3 py-2 text-sm outline-none focus:border-blue-400 tabular-nums"
          />
        </div>

        {/* Preview de precio */}
        <div className="rounded-xl bg-black/30 border border-white/10 px-4 py-2 text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Precio unitario</p>
          <p className="text-sm font-semibold text-slate-200 tabular-nums">${formatMoney(unitPrice)}</p>
        </div>
        <div className="rounded-xl bg-green-500/10 border border-green-400/20 px-4 py-2 text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-green-400/70">Total</p>
          <p className="text-xl font-bold text-green-300 tabular-nums">${formatMoney(total)}</p>
        </div>
      </div>

      {/* Tabla de tarifas del servicio seleccionado */}
      {svc && svc.tiers.length > 1 && (
        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1.5">Tarifas</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {svc.tiers.map(t => {
              const active = qty >= t.min && (t.max === Infinity ? true : qty <= t.max);
              return (
                <span key={t.min}
                  className={`text-[11px] tabular-nums ${active ? "text-blue-300 font-semibold" : "text-slate-600"}`}>
                  {t.max === Infinity ? `${t.min}+` : `${t.min}–${t.max}`} → ${formatMoney(t.price)}{active ? " ◀" : ""}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button onClick={generate} disabled={loading || !qtyValid}
        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition">
        {loading ? "Generando…" : `Generar ticket · $${formatMoney(total)}`}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: Dashboard / Inicio
// ─────────────────────────────────────────────────────────────────────────────
function CopyTicketList({ refreshKey = 0 }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: err } = await listRecentCopyTickets(12);
    setLoading(false);
    if (err) {
      setError(err.message || "No se pudieron cargar los tickets.");
      return;
    }
    setTickets(data || []);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets, refreshKey]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-white/10">
        <div>
          <h2 className="text-sm font-semibold text-white">Tickets recientes</h2>
          <p className="text-xs text-slate-500">Consulta codigos, precios y uso sin abrir Supabase.</p>
        </div>
        <button
          type="button"
          onClick={loadTickets}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50 text-slate-200 text-xs transition"
        >
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 text-xs text-red-300 bg-red-500/10 border-b border-red-400/20">
          {error}
        </div>
      )}

      {loading ? (
        <div className="px-4 py-6 flex items-center gap-3 text-slate-400">
          <div className="w-4 h-4 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
          <span className="text-sm">Cargando tickets...</span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="px-4 py-6 text-sm text-slate-500 text-center">
          Todavia no hay tickets generados.
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {tickets.map((ticket) => {
            const created = ticket.created_at
              ? new Date(ticket.created_at).toLocaleString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
            return (
              <div key={ticket.id || ticket.code} className="px-4 py-3 grid grid-cols-1 md:grid-cols-[120px_1fr_120px_120px] gap-2 md:items-center">
                <div>
                  <p className="font-mono text-sm tracking-widest text-white">{ticket.code}</p>
                  <p className="text-[11px] text-slate-500">{created}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 truncate">{ticket.servicio || "Servicio"}</p>
                  <p className="text-[11px] text-slate-500 truncate">{ticket.descripcion || "Sin descripcion"}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm font-semibold text-green-300 tabular-nums">
                    ${formatMoney(ticket.total)}
                  </p>
                  {ticket.cantidad != null && (
                    <p className="text-[11px] text-slate-500">
                      {ticket.cantidad} pza(s)
                    </p>
                  )}
                </div>
                <div className="md:text-right">
                  <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-medium ${
                    ticket.used
                      ? "bg-red-500/10 border-red-400/25 text-red-300"
                      : "bg-green-500/10 border-green-400/25 text-green-300"
                  }`}>
                    {ticket.used ? "Usado" : "Disponible"}
                  </span>
                  {ticket.redeemed_order_id && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Pedido #{String(ticket.redeemed_order_id).slice(0, 8).toUpperCase()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DashboardTab({ orders, loading, onSelectOrder }) {
  const ahora = Date.now();
  const hoy = orders.filter(o => {
    const d = new Date(o.created_at);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const active = orders.filter(o => o.status === "paid");
  const ready  = orders.filter(o => o.status === "ready");
  const pendingPay = orders.filter(o => o.status === "pending_payment");
  const revenueToday = paidOrdersRevenue(hoy);

  const recientes = [...orders].slice(0, 8);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Pedidos hoy",        value: hoy.length,                         color: "text-white",      bg: "bg-white/5",        border: "border-white/10" },
          { label: "Ganancias hoy",      value: `$${formatMoney(revenueToday)}`,    color: "text-green-300",  bg: "bg-green-500/10",   border: "border-green-400/20" },
          { label: "Pendientes de pago", value: pendingPay.length,                  color: "text-yellow-300", bg: "bg-yellow-500/10",  border: "border-yellow-400/20" },
          { label: "Empezando trabajo",  value: active.length,                      color: "text-orange-300", bg: "bg-orange-500/10",  border: "border-orange-400/20" },
          { label: "Listos para recoger",value: ready.length,                       color: "text-green-300",  bg: "bg-green-500/10",   border: "border-green-400/20" },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl ${k.bg} border ${k.border} p-4 text-center`}>
            <div className={`text-2xl sm:text-3xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-slate-400 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Alertas de pedidos urgentes */}
      {ready.length > 0 && (
        <div className="rounded-2xl bg-green-900/30 border border-green-400/30 px-4 py-3">
          <p className="text-green-200 text-sm font-semibold">
            🎉 {ready.length} pedido{ready.length !== 1 ? "s" : ""} listo{ready.length !== 1 ? "s" : ""} para recoger
          </p>
          <p className="text-green-300/70 text-xs mt-0.5">Notifica a los clientes para que pasen a recoger.</p>
        </div>
      )}
      {pendingPay.length > 0 && (
        <div className="rounded-2xl bg-yellow-900/30 border border-yellow-400/30 px-4 py-3">
          <p className="text-yellow-200 text-sm font-semibold">
            ⏳ {pendingPay.length} pedido{pendingPay.length !== 1 ? "s" : ""} esperando comprobante de pago
          </p>
        </div>
      )}

      {/* Pedidos recientes */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Pedidos recientes</h2>
        {loading ? (
          <div className="flex items-center gap-3 text-slate-400 py-4">
            <div className="w-4 h-4 border-2 border-white/20 border-t-orange-400 rounded-full animate-spin" />
            <span className="text-sm">Cargando…</span>
          </div>
        ) : recientes.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-slate-400 text-sm">No hay pedidos aún.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            {recientes.map((order) => (
              <OrderRow key={order.id} order={order} onSelect={onSelectOrder} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketsTab() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-400/20 bg-blue-500/5 px-4 py-3">
        <h2 className="text-sm font-semibold text-blue-200">Tickets de mostrador</h2>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Genera y consulta códigos de cobro desde este apartado independiente.
        </p>
      </div>
      <CopyTicketForm onCreated={() => setRefreshKey((value) => value + 1)} />
      <CopyTicketList refreshKey={refreshKey} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: Gestión de Servicios (sin cambios funcionales)
// ─────────────────────────────────────────────────────────────────────────────
function AdminServicios() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm]   = useState({});
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("servicios").select("*").order("orden");
    setServicios(mergeAdminServices(data || []));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleActivo(s) {
    const nextActivo = !s.activo;
    const query = s._catalogOnly
      ? supabase.from("servicios").upsert(
          serviceDatabasePayload(s, { activo: nextActivo }),
          { onConflict: "id" }
        )
      : supabase.from("servicios").update({ activo: nextActivo }).eq("id", s.id);
    const { error } = await query;
    if (error) {
      setMsg("Error: " + error.message);
      return;
    }
    setServicios(prev => prev.map(x => x.id === s.id ? { ...x, activo: !s.activo } : x));
  }

  function startEdit(s) {
    setEditingId(s.id);
    setEditForm({ nombre: s.nombre, descripcion: s.descripcion, tag: s.tag, desde_precio: s.desde_precio, suspendido_msg: s.suspendido_msg || "" });
  }

  async function saveEdit() {
    setSaving(true);
    const currentService = servicios.find((service) => service.id === editingId);
    const updates = {
      nombre: editForm.nombre, descripcion: editForm.descripcion, tag: editForm.tag,
      desde_precio: editForm.desde_precio, suspendido_msg: editForm.suspendido_msg || null,
    };
    const query = currentService?._catalogOnly
      ? supabase.from("servicios").upsert(
          serviceDatabasePayload(currentService, updates),
          { onConflict: "id" }
        )
      : supabase.from("servicios").update(updates).eq("id", editingId);
    const { error } = await query;
    setSaving(false);
    if (error) { setMsg("Error: " + error.message); return; }
    setMsg("Guardado correctamente ✓");
    setEditingId(null); load();
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-white/20 border-t-orange-400 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      {msg && <div className="rounded-xl bg-green-500/10 border border-green-400/20 px-4 py-2 text-green-300 text-sm">{msg}</div>}
      {servicios.map((s) => (
        <div key={s.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
            {IMG_MAP[s.id] && <img src={IMG_MAP[s.id]} alt={s.nombre} className="w-12 h-12 object-cover rounded-xl shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-semibold text-sm">{s.nombre}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-400">{s.tag}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${s.activo ? "bg-green-500/15 text-green-300 border-green-400/30" : "bg-red-500/15 text-red-300 border-red-400/30"}`}>
                  {s.activo ? "Activo" : "Suspendido"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{s.descripcion}</p>
              <p className="text-xs text-slate-500">{s.desde_precio}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => toggleActivo(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${s.activo ? "bg-red-500/15 hover:bg-red-500/25 border-red-400/30 text-red-300" : "bg-green-500/15 hover:bg-green-500/25 border-green-400/30 text-green-300"}`}>
                {s.activo ? "Suspender" : "Activar"}
              </button>
              <button onClick={() => editingId === s.id ? setEditingId(null) : startEdit(s)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-300 text-xs transition">
                {editingId === s.id ? "Cancelar" : "Editar"}
              </button>
            </div>
          </div>
          {editingId === s.id && (
            <div className="border-t border-white/10 px-4 py-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: "nombre", label: "Nombre" },
                  { key: "tag", label: "Categoría (tag)" },
                  { key: "desde_precio", label: "Precio referencia" },
                  { key: "suspendido_msg", label: "Mensaje al suspender (opcional)", placeholder: "Temporalmente no disponible" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">{label}</label>
                    <input value={editForm[key] || ""} placeholder={placeholder}
                      onChange={(e) => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-3 py-2 text-sm outline-none focus:border-orange-400" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Descripción</label>
                <textarea value={editForm.descripcion || ""} rows={2}
                  onChange={(e) => setEditForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none" />
              </div>
              <button onClick={saveEdit} disabled={saving}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-semibold transition">
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: Gestión de Precios
// ─────────────────────────────────────────────────────────────────────────────
function AdminPrecios() {
  const [precios, setPrecios]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filtro, setFiltro]         = useState("");
  const [editingId, setEditingId]   = useState(null);
  const [editPrecio, setEditPrecio] = useState("");
  const [saving, setSaving]         = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("catalogo_precios").select("*").order("categoria_slug").order("min_cantidad");
    setPrecios(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function savePrecio(id) {
    const val = parseFloat(editPrecio);
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    await supabase.from("catalogo_precios").update({ precio: val }).eq("id", id);
    setSaving(false);
    setEditingId(null);
    setPrecios(prev => prev.map(p => p.id === id ? { ...p, precio: val } : p));
  }

  const filtrados = filtro
    ? precios.filter(p =>
        (p.categoria || "").toLowerCase().includes(filtro.toLowerCase()) ||
        (p.variante  || "").toLowerCase().includes(filtro.toLowerCase()) ||
        (p.formato   || "").toLowerCase().includes(filtro.toLowerCase())
      )
    : precios;

  const cats = [...new Set(filtrados.map(p => p.categoria_slug))];

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-white/20 border-t-orange-400 rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input value={filtro} onChange={(e) => setFiltro(e.target.value)}
          placeholder="Filtrar por categoría, variante o formato…"
          className="flex-1 min-w-[220px] rounded-xl bg-white/10 border border-white/20 text-white px-3 py-2 text-sm outline-none focus:border-orange-400" />
        <span className="text-xs text-slate-500">{filtrados.length} entradas</span>
      </div>

      {cats.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">
          {precios.length === 0 ? "No hay precios en el catálogo aún." : "Sin resultados para ese filtro."}
        </div>
      )}

      <div className="space-y-4">
        {cats.map((cat) => {
          const items = filtrados.filter(p => p.categoria_slug === cat);
          const variantes = [...new Set(items.map(p => p.variante_slug))];
          return (
            <div key={cat} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">{items[0]?.categoria || cat}</h3>
                <p className="text-xs text-slate-400">{items[0]?.servicio}</p>
              </div>
              {variantes.map((vSlug) => {
                const vItems = items.filter(p => p.variante_slug === vSlug);
                const formatos = [...new Set(vItems.map(p => p.formato_slug))];
                return (
                  <div key={vSlug} className="px-4 py-3 border-b border-white/5 last:border-0">
                    <p className="text-xs font-medium text-slate-300 mb-2">{vItems[0]?.variante}</p>
                    {formatos.map((fSlug) => {
                      const fItems = vItems.filter(p => p.formato_slug === fSlug);
                      return (
                        <div key={fSlug} className="mb-2">
                          <p className="text-[11px] text-slate-500 mb-1">{fItems[0]?.formato}</p>
                          <div className="flex flex-wrap gap-2">
                            {fItems.map((p) => (
                              <div key={p.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 flex items-center gap-2">
                                <span className="text-[11px] text-slate-400">{p.rango_texto}:</span>
                                {editingId === p.id ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] text-slate-400">$</span>
                                    <input type="number" step="0.01" min="0" value={editPrecio}
                                      onChange={(e) => setEditPrecio(e.target.value)} autoFocus
                                      onKeyDown={(e) => { if (e.key === "Enter") savePrecio(p.id); if (e.key === "Escape") setEditingId(null); }}
                                      className="w-20 rounded-lg bg-white/10 border border-orange-400 text-white px-2 py-0.5 text-xs outline-none" />
                                    <button onClick={() => savePrecio(p.id)} disabled={saving}
                                      className="px-2 py-0.5 rounded-lg bg-orange-500 text-white text-[10px] font-semibold">
                                      {saving ? "…" : "OK"}
                                    </button>
                                    <button onClick={() => setEditingId(null)}
                                      className="px-2 py-0.5 rounded-lg bg-white/10 text-slate-300 text-[10px]">✕</button>
                                  </div>
                                ) : (
                                  <button onClick={() => { setEditingId(p.id); setEditPrecio(String(p.precio)); }}
                                    className="text-[12px] font-semibold text-green-300 hover:text-green-200 transition tabular-nums">
                                    ${Number(p.precio).toFixed(2)}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: Reportes
// ─────────────────────────────────────────────────────────────────────────────
function AdminReportes({ orders }) {
  const [periodo, setPeriodo] = useState(30);

  const ahora = Date.now();
  const enPeriodo = orders.filter(o => new Date(o.created_at).getTime() >= ahora - periodo * 86400000);

  const diasVisibles = Math.min(periodo, 14);
  const byDay = [];
  for (let i = diasVisibles - 1; i >= 0; i--) {
    const d = new Date(ahora - i * 86400000);
    const key = d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
    const count = enPeriodo.filter(o => {
      const od = new Date(o.created_at);
      return od.getDate() === d.getDate() && od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
    }).length;
    byDay.push({ key, count });
  }
  const maxDay = Math.max(...byDay.map(d => d.count), 1);

  const svcCount = {};
  enPeriodo.forEach(o => (o.items || []).forEach(it => {
    const label = it.serviceLabel || it.serviceKey || "Otro";
    svcCount[label] = (svcCount[label] || 0) + 1;
  }));
  const topSvc = Object.entries(svcCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxSvc = Math.max(...topSvc.map(([,v]) => v), 1);

  const statusDist = {};
  enPeriodo.forEach(o => { statusDist[o.status] = (statusDist[o.status] || 0) + 1; });
  const payDist = { card: 0, transfer: 0, mercadopago: 0 };
  enPeriodo.forEach(o => {
    if (o.payment_method === "mercadopago") payDist.mercadopago++;
    else if (o.payment_method === "card") payDist.card++;
    else payDist.transfer++;
  });
  const paidInPeriod = enPeriodo.filter((o) => o.status !== "cancelled" && isPaymentConfirmed(o));
  const revenueInPeriod = paidOrdersRevenue(enPeriodo);
  const averageTicket = paidInPeriod.length ? revenueInPeriod / paidInPeriod.length : 0;

  const cancelledPct = enPeriodo.length ? Math.round(((statusDist["cancelled"] || 0) / enPeriodo.length) * 100) : 0;
  const completedPct = enPeriodo.length ? Math.round(((statusDist["ready"] || 0) / enPeriodo.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Periodo:</span>
        {[7, 14, 30, 90].map(d => (
          <button key={d} onClick={() => setPeriodo(d)}
            className={`px-3 py-1 rounded-xl text-xs border transition ${periodo === d ? "bg-orange-500/20 border-orange-400/50 text-orange-300" : "bg-white/5 border-white/15 text-slate-400 hover:bg-white/10"}`}>
            {d} días
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">{enPeriodo.length} pedidos en el periodo</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "Total pedidos", value: enPeriodo.length, cls: "text-white", bg: "bg-white/5 border-white/10" },
          { label: "Ganancias pagadas", value: `$${formatMoney(revenueInPeriod)}`, cls: "text-green-300", bg: "bg-green-500/10 border-green-400/20" },
          { label: "Ticket promedio", value: `$${formatMoney(averageTicket)}`, cls: "text-blue-300", bg: "bg-blue-500/10 border-blue-400/20" },
          { label: "Listos",        value: `${completedPct}%`, cls: "text-green-300", bg: "bg-green-500/10 border-green-400/20" },
          { label: "Cancelados",    value: `${cancelledPct}%`, cls: "text-red-300",   bg: "bg-red-500/10 border-red-400/20" },
          { label: "Pago en linea", value: enPeriodo.length ? `${Math.round(payDist.mercadopago / enPeriodo.length * 100)}%` : "0%", cls: "text-blue-300", bg: "bg-blue-500/10 border-blue-400/20" },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-4 text-center ${k.bg}`}>
            <div className={`text-2xl font-bold ${k.cls}`}>{k.value}</div>
            <div className="text-xs text-slate-400 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
        <h3 className="text-sm font-semibold text-white mb-4">Pedidos por día (últimos {diasVisibles} días)</h3>
        {byDay.every(d => d.count === 0) ? (
          <p className="text-slate-500 text-sm text-center py-6">Sin pedidos en este periodo.</p>
        ) : (
          <div className="flex items-end gap-1 h-28">
            {byDay.map(d => (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-[10px] text-slate-400">{d.count > 0 ? d.count : ""}</span>
                <div className="w-full rounded-t-lg bg-orange-500/60 hover:bg-orange-500/80 transition-all"
                  style={{ height: `${Math.round((d.count / maxDay) * 80) + (d.count > 0 ? 4 : 0)}px`, minHeight: d.count > 0 ? "4px" : "2px" }}
                  title={`${d.key}: ${d.count} pedido${d.count !== 1 ? "s" : ""}`} />
                <span className="text-[9px] text-slate-500 truncate w-full text-center">{d.key}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {topSvc.length > 0 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Servicios más pedidos</h3>
          <div className="space-y-2">
            {topSvc.map(([label, count], i) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                <span className="text-xs text-slate-300 w-40 truncate">{label}</span>
                <div className="flex-1 h-5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all"
                    style={{ width: `${Math.round((count / maxSvc) * 100)}%` }} />
                </div>
                <span className="text-xs text-orange-300 font-semibold w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL PRINCIPAL ADMIN
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "inicio",    label: "Inicio",    icon: "🏠" },
  { id: "pedidos",   label: "Pedidos",   icon: "📋" },
  { id: "tickets",   label: "Tickets",   icon: "🎫" },
  { id: "servicios", label: "Servicios", icon: "⚙️" },
  { id: "precios",   label: "Precios",   icon: "💲" },
  { id: "reportes",  label: "Reportes",  icon: "📊" },
];

export default function Admin({ user = null, accessToken: initialAccessToken = null, profile = null }) {
  const { loading: adminLoading, isAdmin } = useIsAdmin({ user, profile });
  const waitingForProfile = Boolean(user && !profile && !isAdmin);
  const [tab, setTab]         = useState("inicio");
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailOrder, setDetailOrder] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const headerRef = useRef(null);
  const mainRef = useRef(null);

  const patchOrder = useCallback((updatedOrder) => {
    if (!updatedOrder?.id) return;
    setOrders((current) =>
      current.map((order) =>
        order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
      )
    );
    setDetailOrder((current) =>
      current?.id === updatedOrder.id ? { ...current, ...updatedOrder } : current
    );
  }, []);

  const resolveAccessToken = useCallback(async ({ forceRefresh = false } = {}) => {
    let token = initialAccessToken || null;
    if (!token) {
      const current = await supabase.auth.getSession();
      token = current.data?.session?.access_token || null;
    }

    if (forceRefresh || jwtExpiresSoon(token)) {
      try {
        const refreshed = await Promise.race([
          supabase.auth.refreshSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("token refresh timeout")), 5000)),
        ]);
        if (!refreshed.error && refreshed.data?.session) {
          token = refreshed.data.session.access_token || null;
        }
      } catch {
        // Si el refresh falla o tarda más de 5s, continuar con el token actual
      }
    }

    setAccessToken(token);
    return token;
  }, [initialAccessToken]);

  const load = useCallback(async (options = {}) => {
    const forceRefresh = options?.forceRefresh === true;
    setLoading(true);
    try {
      const token = await resolveAccessToken({ forceRefresh });
      const fetchWithTimeout = (freshToken) => Promise.race([
        fetchAllOrders({ accessToken: freshToken }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Tiempo de espera agotado.")), 10000)
        ),
      ]);
      let { data, error } = await fetchWithTimeout(token);

      if (error && isAuthExpiredError(error)) {
        const freshToken = await resolveAccessToken({ forceRefresh: true });
        ({ data, error } = await fetchWithTimeout(freshToken));
      }

      if (error) {
        console.error("[Admin] fetchAllOrders error:", error);
        if (isAuthExpiredError(error)) {
          alert("Tu sesión de administrador expiró. Vuelve a iniciar sesión.");
          await supabase.auth.signOut().catch(() => {});
          window.location.href = "/";
        }
        return;
      }
      setOrders(data || []);
    } catch (e) {
      console.error("[Admin] Error al cargar pedidos:", e.message);
    } finally {
      setLoading(false);
    }
  }, [resolveAccessToken]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  useEffect(() => {
    if (!isAdmin) return;
    const refreshVisible = () => {
      if (document.visibilityState === "visible") {
        load({ forceRefresh: true });
      }
    };
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [isAdmin, load]);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_status_history" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, load]);

  useEffect(() => {
    if (!isAdmin || !headerRef.current || !mainRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { y: -18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" }
      );
      gsap.fromTo(
        mainRef.current.children,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.045, ease: "power2.out", delay: 0.08 }
      );
    });
    return () => ctx.revert();
  }, [isAdmin, tab, orders.length]);

  if (adminLoading || waitingForProfile) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-orange-400 rounded-full animate-spin" />
    </div>
  );

  if (!isAdmin) return (
    <main className="min-h-screen bg-slate-950 px-4 pb-20 pt-28 text-white">
      <section className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-orange-400/30 bg-orange-500/15 text-lg">
          CC
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
          Acceso de administrador
        </p>
        <h1 className="mt-3 text-2xl font-bold">Inicia sesion con una cuenta autorizada</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Esta area solo muestra pedidos, precios y herramientas internas para administradores.
          Si ya tienes permisos, usa el boton Ingresar de la barra superior y vuelve a esta pagina.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/#inicio"
            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
          >
            Volver al inicio
          </Link>
          <Link
            to="/#servicios"
            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Ver servicios
          </Link>
        </div>
      </section>
    </main>
  );

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1; return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header ref={headerRef} className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">
              CC
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-none">Panel Admin</h1>
              <p className="text-slate-500 text-[11px]">Copy Center 2000</p>
            </div>
          </div>

          {/* Badges rápidos */}
          <div className="hidden sm:flex items-center gap-2">
            {(counts["pending_payment"] || 0) > 0 && (
              <button onClick={() => setTab("pedidos")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-yellow-500/15 border border-yellow-400/20 text-yellow-300 text-xs hover:bg-yellow-500/25 transition">
                ⏳ {counts["pending_payment"]} sin pago
              </button>
            )}
            {(counts["ready"] || 0) > 0 && (
              <button onClick={() => setTab("pedidos")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-green-500/15 border border-green-400/20 text-green-300 text-xs hover:bg-green-500/25 transition">
                🎉 {counts["ready"]} listos
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => load({ forceRefresh: true })}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs transition">
              ↻ Actualizar
            </button>
            <button onClick={() => {
              supabase.auth.signOut().catch(() => {});
              try { for (const k of Object.keys(localStorage)) if (k.startsWith("sb-") || k.toLowerCase().includes("supabase")) localStorage.removeItem(k); } catch {}
              window.location.href = "/";
            }} className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs transition">
              Salir
            </button>
          </div>
        </div>

        {/* Tabs de navegación */}
        <div className="max-w-6xl mx-auto px-4 pb-0">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  tab === t.id
                    ? "border-orange-400 text-orange-300"
                    : "border-transparent text-slate-400 hover:text-white hover:border-white/30"
                }`}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {t.id === "pedidos" && orders.length > 0 && (
                  <span className="ml-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{orders.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main ref={mainRef} className="max-w-6xl mx-auto px-4 py-6">

        {tab === "inicio" && (
          <DashboardTab
            orders={orders}
            loading={loading}
            onSelectOrder={(order) => {
              setDetailOrder(order);
              setTab("pedidos");
            }}
          />
        )}

        {tab === "pedidos" && (
          <PedidosTab
            orders={orders}
            loading={loading}
            onRefresh={load}
            accessToken={accessToken}
            getAccessToken={resolveAccessToken}
            onOrderPatch={patchOrder}
          />
        )}

        {tab === "tickets" && <TicketsTab />}

        {tab === "servicios" && (
          <>
            <div className="rounded-2xl border border-orange-400/20 bg-orange-500/5 px-4 py-3 mb-4">
              <p className="text-sm text-orange-200">
                Activa, suspende o edita cada servicio. Los cambios se reflejan inmediatamente para los clientes.
              </p>
            </div>
            <AdminServicios />
          </>
        )}

        {tab === "precios" && (
          <>
            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/5 px-4 py-3 mb-4">
              <p className="text-sm text-blue-200">
                Haz clic en cualquier precio para editarlo directamente. Los cambios se guardan al instante.
              </p>
            </div>
            <AdminPrecios />
          </>
        )}

        {tab === "reportes" && (
          <AdminReportes orders={orders} />
        )}
      </main>

      {/* Panel de detalle global (usado desde Dashboard) */}
      {detailOrder && (
        <OrderDetailPanel
          order={orders.find(o => o.id === detailOrder.id) || detailOrder}
          onClose={() => setDetailOrder(null)}
          onStatusChange={(updatedOrder) => { patchOrder(updatedOrder); load(); }}
          accessToken={accessToken}
          getAccessToken={resolveAccessToken}
        />
      )}
    </div>
  );
}
