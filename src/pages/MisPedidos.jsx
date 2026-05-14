// src/pages/MisPedidos.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  fetchMyOrders,
  subscribeToMyOrders,
  STATUS_LABELS,
  STATUS_ORDER,
  buildOrderWhatsAppMessage,
  openWhatsApp,
  SHOP_PHONE,
} from "../lib/orders";

const STATUS_COLORS = {
  pending_payment:  "text-yellow-300 bg-yellow-500/15 border-yellow-400/30",
  payment_approved: "text-blue-300 bg-blue-500/15 border-blue-400/30",
  in_progress:      "text-orange-300 bg-orange-500/15 border-orange-400/30",
  printing:         "text-purple-300 bg-purple-500/15 border-purple-400/30",
  ready:            "text-green-300 bg-green-500/15 border-green-400/30",
  completed:        "text-slate-300 bg-slate-500/15 border-slate-400/30",
  cancelled:        "text-red-300 bg-red-500/15 border-red-400/30",
};

const STATUS_ICONS = {
  pending_payment:  "⏳",
  payment_approved: "✅",
  in_progress:      "🖨️",
  printing:         "⚙️",
  ready:            "🎉",
  completed:        "📦",
  cancelled:        "❌",
};

function ProgressBar({ status }) {
  const idx = STATUS_ORDER.indexOf(status);
  const total = STATUS_ORDER.length - 1; // excluye 'completed'
  const pct = idx < 0 ? 0 : Math.round((idx / (STATUS_ORDER.length - 1)) * 100);

  if (status === "cancelled") return null;

  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
        <span>Pendiente de pago</span>
        <span>Listo para recoger</span>
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

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const statusClass = STATUS_COLORS[order.status] || "text-slate-300 bg-slate-500/15 border-slate-400/30";
  const icon = STATUS_ICONS[order.status] || "📋";
  const label = STATUS_LABELS[order.status] || order.status;

  const fecha = new Date(order.created_at).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const history = (order.order_status_history || [])
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  function handleContactWA() {
    const msg = buildOrderWhatsAppMessage({ order, isNew: false });
    openWhatsApp(SHOP_PHONE, msg);
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
            {order.payment_method === "card" ? "💳 Tarjeta" : "🏦 Transferencia"} —{" "}
            {order.payment_status === "approved" ? "✅ Pago confirmado" : "⏳ Pendiente de pago"}
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
          {order.payment_method === "transfer" && order.payment_status === "pending" && (
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

export default function MisPedidos({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await fetchMyOrders(user.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setOrders(data || []);
  }

  useEffect(() => {
    load();
  }, [user?.id]);

  // Realtime: actualizar cuando cambia un pedido
  useEffect(() => {
    if (!user?.id) return;
    const channel = subscribeToMyOrders(user.id, () => load());
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis Pedidos</h1>
          <p className="text-slate-400 text-sm mt-0.5">Sigue el estado de tus pedidos en tiempo real</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs"
        >
          ↻ Actualizar
        </button>
      </div>

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

      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </main>
  );
}
