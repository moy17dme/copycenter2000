// src/pages/MisPedidos.jsx
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  fetchMyOrders,
  subscribeToMyOrders,
  cancelOrder,
  STATUS_LABELS,
  STATUS_ORDER,
  isPaymentConfirmed,
  getOrderFinancials,
  formatMoney,
  buildOrderWhatsAppMessage,
  openWhatsApp,
  SHOP_PHONE,
} from "../lib/orders";
import { generateReceiptPdf } from "../lib/generateReceiptPdf";

const STATUS_COLORS = {
  pending_payment:  "text-yellow-300 bg-yellow-500/15 border-yellow-400/30",
  paid:             "text-blue-300 bg-blue-500/15 border-blue-400/30",
  payment_approved: "text-blue-300 bg-blue-500/15 border-blue-400/30",
  in_progress:      "text-orange-300 bg-orange-500/15 border-orange-400/30",
  printing:         "text-purple-300 bg-purple-500/15 border-purple-400/30",
  ready:            "text-green-300 bg-green-500/15 border-green-400/30",
  completed:        "text-slate-300 bg-slate-500/15 border-slate-400/30",
  cancelled:        "text-red-300 bg-red-500/15 border-red-400/30",
};

const STATUS_ICONS = {
  pending_payment:  "⏳",
  paid:             "✅",
  payment_approved: "✅",
  in_progress:      "🖨️",
  printing:         "⚙️",
  ready:            "🎉",
  completed:        "📦",
  cancelled:        "❌",
};

function ProgressBar({ status }) {
  const idx = STATUS_ORDER.indexOf(status);
  const pct = idx < 0 ? 0 : Math.round((idx / (STATUS_ORDER.length - 1)) * 100);
  const steps = [
    { status: "pending_payment", label: "Pendiente" },
    { status: "paid", label: "Empezando trabajo" },
    { status: "ready", label: "Listo" },
  ];

  if (status === "cancelled") return null;

  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
        {steps.map((step) => (
          <span
            key={step.status}
            className={STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf(step.status) ? "text-slate-300" : ""}
          >
            {step.label}
          </span>
        ))}
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-green-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Estados en los que el usuario todavía puede cancelar (antes de que el admin comience)
const CANCELLABLE_STATUSES = new Set(["pending_payment"]);

function paymentMethodLabel(order) {
  if (order.payment_method === "mercadopago") return "💳 Mercado Pago";
  if (order.payment_method === "card") return "💳 Tarjeta";
  return "🏦 Transferencia";
}

function OrderCard({ order, onCancelled }) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const statusClass = STATUS_COLORS[order.status] || "text-slate-300 bg-slate-500/15 border-slate-400/30";
  const icon = STATUS_ICONS[order.status] || "📋";
  const label = STATUS_LABELS[order.status] || order.status;
  const financials = getOrderFinancials(order);

  const fecha = new Date(order.created_at).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const history = (order.order_status_history || [])
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const canCancel = CANCELLABLE_STATUSES.has(order.status);

  function handleContactWA() {
    const msg = buildOrderWhatsAppMessage({ order, isNew: false });
    openWhatsApp(SHOP_PHONE, msg);
  }

  const handleDownloadPdf = useCallback(async () => {
    setDownloadingPdf(true);
    try {
      await generateReceiptPdf(order);
    } catch (err) {
      console.error("[pdf] Error generando comprobante:", err);
    } finally {
      setDownloadingPdf(false);
    }
  }, [order]);

  async function handleCancel() {
    setCancelling(true);
    const { error } = await cancelOrder(order.id);
    setCancelling(false);
    setConfirmCancel(false);
    if (error) {
      alert("No se pudo cancelar el pedido. Intenta de nuevo.");
    } else {
      onCancelled?.();
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm">Pedido #{shortId}</span>
            <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${statusClass}`}>
              {icon} {label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{fecha}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {paymentMethodLabel(order)} —{" "}
            {isPaymentConfirmed(order) ? "✅ Pago confirmado" : "⏳ Pendiente de pago"}
          </p>
          <p className="text-xs text-green-300 font-semibold tabular-nums mt-0.5">
            Total: {financials.hasKnownTotal ? `$${formatMoney(financials.total)}` : "por cotizar"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition shrink-0"
        >
          {expanded ? "Ocultar" : "Ver detalle"}
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="px-4 pb-3">
        <ProgressBar status={order.status} />
      </div>

      {/* Servicios (siempre visible) */}
      <div className="px-4 pb-3 space-y-1">
        {(order.items || []).map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
            <span className="text-slate-500">#{i + 1}</span>
            <span>{it.serviceLabel || it.serviceKey}</span>
            {it.fileName && <span className="ml-auto text-slate-500 truncate max-w-[140px]">{it.fileName}</span>}
          </div>
        ))}
      </div>

      {/* Detalle expandible */}
      {expanded && (
        <div className="border-t border-white/10 px-4 py-3 space-y-4">

          {/* Instrucciones */}
          {order.notes && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Instrucciones</p>
              <p className="text-sm text-slate-200 bg-white/5 rounded-xl px-3 py-2">{order.notes}</p>
            </div>
          )}

          {/* Transferencia pendiente */}
          {order.payment_method === "transfer" && !isPaymentConfirmed(order) && (
            <div className="rounded-xl bg-yellow-900/30 border border-yellow-400/20 p-3 text-sm">
              <p className="text-yellow-200 font-medium">⚠️ Envía tu comprobante</p>
              <p className="text-slate-300 text-xs mt-1">
                Para que tu pedido inicie, envía el comprobante de transferencia por WhatsApp.
              </p>
              <button
                type="button"
                onClick={handleContactWA}
                className="mt-2 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition"
              >
                💬 Enviar comprobante por WhatsApp
              </button>
            </div>
          )}

          {/* Historial de estados */}
          {history.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Historial</p>
              <div className="space-y-2">
                {history.map((h) => {
                  const hFecha = new Date(h.created_at).toLocaleString("es-MX", {
                    day: "2-digit", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  });
                  return (
                    <div key={h.id || h.created_at} className="flex items-start gap-2 text-xs">
                      <span className="text-slate-500 shrink-0">{hFecha}</span>
                      <span className="text-slate-300">
                        {STATUS_ICONS[h.status] || "●"} {STATUS_LABELS[h.status] || h.status}
                        {h.message && h.message !== STATUS_LABELS[h.status] && (
                          <span className="text-slate-400"> — {h.message}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cancelar pedido */}
          {canCancel && (
            confirmCancel ? (
              <div className="rounded-xl bg-red-900/30 border border-red-400/30 p-3 space-y-2">
                <p className="text-sm text-red-200 font-medium">¿Seguro que deseas cancelar este pedido?</p>
                <p className="text-xs text-slate-400">Esta acción no se puede deshacer.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={handleCancel}
                    className="flex-1 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium transition"
                  >
                    {cancelling ? "Cancelando…" : "Sí, cancelar pedido"}
                  </button>
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => setConfirmCancel(false)}
                    className="flex-1 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-medium transition"
                  >
                    No, volver
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="w-full py-2 rounded-xl border border-red-500/30 bg-red-600/10 text-red-300 hover:bg-red-600/20 text-xs font-medium transition"
              >
                ✕ Cancelar pedido
              </button>
            )
          )}

          {/* Descargar comprobante PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="w-full py-2 rounded-xl border text-xs font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ borderColor: 'rgba(78,123,218,0.35)', backgroundColor: 'rgba(31,74,168,0.1)', color: '#4E7BDA' }}
          >
            {downloadingPdf ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                Generando PDF…
              </>
            ) : (
              <>📄 Descargar comprobante PDF</>
            )}
          </button>

          {/* Contactar */}
          <button
            type="button"
            onClick={handleContactWA}
            className="w-full py-2 rounded-xl border border-green-500/30 bg-green-600/10 text-green-300 hover:bg-green-600/20 text-xs font-medium transition"
          >
            💬 Contactar a Copy Center 2000 sobre este pedido
          </button>
        </div>
      )}
    </div>
  );
}

const STATUS_FILTER_OPTIONS = [
  { value: "all",             label: "Todos" },
  { value: "pending_payment", label: "Pendiente de pago" },
  { value: "paid",            label: "Empezando trabajo" },
  { value: "ready",           label: "Listo para recoger" },
  { value: "cancelled",       label: "Cancelado" },
];

export default function MisPedidos({ user, session }) {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const returnOrderId =
    searchParams.get("order") ||
    searchParams.get("external_reference") ||
    "";
  const paymentReturnStatus = (
    searchParams.get("status") ||
    searchParams.get("collection_status") ||
    searchParams.get("payment_status") ||
    ""
  ).toLowerCase();

  const load = useCallback(async ({ forceRefresh = false, silent = false } = {}) => {
    if (!user?.id) {
      if (!silent) setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError("");
    try {
      // Timeout de 8 segundos para evitar carga infinita si el token está roto
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Tiempo de espera agotado. Intenta recargar.")), 8000)
      );
      const query = fetchMyOrders(user.id, {
        accessToken: session?.access_token || null,
        forceRefresh,
      });
      const { data, error: err } = await Promise.race([query, timeout]);
      if (err) { setError(err.message); return; }
      setOrders(data || []);
    } catch (e) {
      setError(e.message || "No se pudieron cargar los pedidos.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [session?.access_token, user?.id]);

  useEffect(() => { load(); }, [load]);

  // Si el usuario se desloguea mientras carga, salir del loading de inmediato
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setOrders([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = subscribeToMyOrders(user.id, () => load());
    return () => { supabase.removeChannel(channel); };
  }, [load, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
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
  }, [load, user?.id]);

  useEffect(() => {
    if (!user?.id || !returnOrderId) return;

    load({ forceRefresh: true, silent: true });
    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      load({ forceRefresh: true, silent: true });
      if (attempts >= 6) window.clearInterval(intervalId);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [load, returnOrderId, user?.id]);

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchId      = String(o.id).toLowerCase().includes(q);
      const matchService = (o.items || []).some((it) =>
        (it.serviceLabel || it.serviceKey || "").toLowerCase().includes(q)
      );
      const matchFile = (o.items || []).some((it) =>
        (it.fileName || "").toLowerCase().includes(q)
      );
      return matchId || matchService || matchFile;
    }
    return true;
  });
  const returnOrder = returnOrderId
    ? orders.find((order) => String(order.id) === String(returnOrderId))
    : null;
  const returnShortId = returnOrderId ? String(returnOrderId).slice(0, 8).toUpperCase() : "";
  const returnPaymentConfirmed = returnOrder ? isPaymentConfirmed(returnOrder) : false;
  const returnLooksFailed = ["failure", "failed", "rejected", "cancelled", "canceled"].includes(paymentReturnStatus);
  const returnLooksPending = ["pending", "in_process", "in_mediation"].includes(paymentReturnStatus);

  if (!user) {
    return (
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-16 2xl:px-32 pt-10 pb-24">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white text-lg font-semibold mb-2">Inicia sesión para ver tus pedidos</p>
          <p className="text-slate-400 text-sm">Necesitas una cuenta para rastrear el estado de tus pedidos.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full px-4 sm:px-8 lg:px-16 2xl:px-32 pt-6 md:pt-10 pb-24 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis Pedidos</h1>
          <p className="text-slate-400 text-sm mt-0.5">Sigue el estado de tus pedidos en tiempo real</p>
        </div>
        <button
          type="button"
          onClick={() => load({ forceRefresh: true })}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs"
        >
          ↻ Actualizar
        </button>
      </div>

      {/* Búsqueda y filtros */}
      {returnOrderId && (
        <div
          className={[
            "mb-5 rounded-2xl border px-4 py-3 text-sm",
            returnPaymentConfirmed
              ? "border-green-400/30 bg-green-500/10 text-green-200"
              : returnLooksFailed
                ? "border-red-400/30 bg-red-500/10 text-red-200"
                : "border-yellow-400/30 bg-yellow-500/10 text-yellow-100",
          ].join(" ")}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">
                {returnPaymentConfirmed
                  ? "Pago confirmado"
                  : returnLooksFailed
                    ? "Pago no completado"
                    : returnLooksPending
                      ? "Pago pendiente en Mercado Pago"
                      : "Esperando confirmacion de Mercado Pago"}
              </p>
              <p className="mt-0.5 text-xs opacity-85">
                Pedido #{returnShortId}.{" "}
                {returnPaymentConfirmed
                  ? "Tu pedido ya entro a la fila de trabajo."
                  : returnLooksFailed
                    ? "Puedes intentar pagar otra vez o contactar al negocio."
                    : "Esta pantalla se actualizara automaticamente cuando llegue el webhook."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => load({ forceRefresh: true })}
              className="rounded-xl border border-current/25 px-3 py-1.5 text-xs font-medium transition hover:bg-white/10"
            >
              Revisar ahora
            </button>
          </div>
        </div>
      )}

      {orders.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por servicio, archivo o ID…"
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-orange-400 placeholder:text-slate-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-orange-400 cursor-pointer"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900">
                {opt.label}
                {opt.value !== "all" && orders.filter((o) => o.status === opt.value).length > 0
                  ? ` (${orders.filter((o) => o.status === opt.value).length})`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-slate-400 py-8">
          <div className="w-5 h-5 border-2 border-white/20 border-t-orange-400 rounded-full animate-spin" />
          <span className="text-sm">Cargando pedidos…</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/15 border border-red-400/30 px-4 py-3 text-sm text-red-200 mb-4">
          {error}
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-white font-medium">No tienes pedidos aún</p>
          <p className="text-slate-400 text-sm mt-1">Tus pedidos aparecerán aquí una vez que los realices.</p>
        </div>
      )}

      {!loading && orders.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-slate-400 text-sm">Sin resultados para esa búsqueda.</p>
          <button
            type="button"
            onClick={() => { setSearch(""); setStatusFilter("all"); }}
            className="mt-2 text-xs text-orange-400 hover:text-orange-300"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((order) => (
          <OrderCard key={order.id} order={order} onCancelled={load} />
        ))}
      </div>

      {filtered.length > 0 && (
        <p className="text-center text-xs text-slate-600 mt-6">
          {filtered.length === orders.length
            ? `${orders.length} pedido${orders.length !== 1 ? "s" : ""} en total`
            : `${filtered.length} de ${orders.length} pedidos`}
        </p>
      )}
    </main>
  );
}
