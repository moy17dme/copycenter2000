// src/pages/Admin.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
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
} from "../lib/orders";
import { createCopyTicket } from "../lib/copyTickets";

// ── Imágenes de servicios ──────────────────────────────────────────────────────
import digi    from "@/assets/digi.png";
import engar   from "@/assets/engar.png";
import planos  from "@/assets/planos.png";
import artes   from "@/assets/artes.png";
import stickers from "@/assets/stickers.png";
import pvcImg  from "@/assets/pvc.png";
import subliImg from "@/assets/sublimacion.png";
import scanImg from "@/assets/scan.png";
import pinsImg from "@/assets/pins.png";

const IMG_MAP = {
  impresion: digi, copias: engar, ploteo: planos, artes, stickers,
  pvc: pvcImg, sublimacion: subliImg, fotobotones: pinsImg, escaneo: scanImg,
};

// ── Colores de estado ──────────────────────────────────────────────────────────
const STATUS_COLORS = {
  pending_payment:  "bg-yellow-500/15 text-yellow-300 border-yellow-400/30",
  payment_approved: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  in_progress:      "bg-orange-500/15 text-orange-300 border-orange-400/30",
  printing:         "bg-purple-500/15 text-purple-300 border-purple-400/30",
  ready:            "bg-green-500/15 text-green-300 border-green-400/30",
  completed:        "bg-slate-500/15 text-slate-300 border-slate-400/30",
  cancelled:        "bg-red-500/15 text-red-300 border-red-400/30",
};

const ALL_STATUSES = [...STATUS_ORDER, "cancelled"];

// ══════════════════════════════════════════════════════════════════════════════
// TICKET DE COPIAS
// ══════════════════════════════════════════════════════════════════════════════
function CopyTicketPanel() {
  const [loading, setLoading]   = useState(false);
  const [lastCode, setLastCode] = useState(null);
  const [error, setError]       = useState("");
  const [copied, setCopied]     = useState(false);

  async function handleGenerate() {
    setLoading(true); setError(""); setLastCode(null);
    const { code, error: err } = await createCopyTicket();
    setLoading(false);
    if (err) { setError(err.message); return; }
    setLastCode(code); setCopied(false);
  }

  function handleCopy() {
    if (!lastCode) return;
    navigator.clipboard.writeText(lastCode).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-2xl border border-blue-400/20 bg-blue-500/5 p-5 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-blue-300">🎫 Ticket de autorización — Copias / Engargolado</h2>
          <p className="text-xs text-slate-400 mt-1">Código de un solo uso válido por 4 horas.</p>
        </div>
        <button type="button" disabled={loading} onClick={handleGenerate}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition shrink-0">
          {loading ? "Generando…" : "Generar código"}
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-red-400 bg-red-900/20 rounded-xl px-3 py-2">{error}</p>}
      {lastCode && (
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Código para el cliente</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-mono font-bold tracking-[0.3em] text-white select-all">{lastCode}</span>
              <button type="button" onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-300 transition shrink-0">
                {copied ? "✓ Copiado" : "Copiar"}
              </button>
            </div>
          </div>
          <div className="rounded-xl bg-yellow-500/10 border border-yellow-400/20 px-3 py-2">
            <p className="text-[11px] text-yellow-300 font-medium">⚠️ Uso único · 4 horas</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FILA DE PEDIDO
// ══════════════════════════════════════════════════════════════════════════════
function OrderRow({ order, onStatusChange }) {
  const [expanded, setExpanded]     = useState(false);
  const [updating, setUpdating]     = useState(false);
  const [statusNote, setStatusNote] = useState("");

  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const fecha = new Date(order.created_at).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const statusClass = STATUS_COLORS[order.status] || "bg-slate-500/15 text-slate-300";

  async function handleSetStatus(newStatus) {
    setUpdating(true);
    const { error } = await updateOrderStatus(order.id, newStatus, statusNote);
    setUpdating(false);
    if (error) { alert(`Error: ${error.message}`); return; }
    onStatusChange();
  }

  const history = (order.order_status_history || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const nextStatus = STATUS_ORDER[STATUS_ORDER.indexOf(order.status) + 1];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="px-4 py-3 flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm">#{shortId}</span>
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${statusClass}`}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
            {order.payment_method === "transfer" && order.payment_status === "pending" && (
              <span className="text-[11px] px-2 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-500/15 text-yellow-300 font-medium">⏳ Sin comprobante</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">👤 {order.customer_name || "Sin nombre"} — 📱 {order.customer_phone || "Sin tel."} — {fecha}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {order.payment_method === "card" ? "💳 Tarjeta" : "🏦 Transferencia"} — {(order.items || []).map((it) => it.serviceLabel || it.serviceKey).join(", ")}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {nextStatus && (
            <button type="button" disabled={updating} onClick={() => handleSetStatus(nextStatus)}
              className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/30 text-orange-300 text-xs font-medium transition disabled:opacity-50">
              {updating ? "…" : `→ ${STATUS_LABELS[nextStatus]}`}
            </button>
          )}
          {order.customer_phone && (
            <button type="button"
              onClick={() => { const msg = buildStatusNotificationMessage(order, order.status); const cleaned = order.customer_phone.replace(/\D/g,""); openWhatsApp(cleaned.length===10?`52${cleaned}`:cleaned, msg); }}
              className="px-3 py-1.5 rounded-xl bg-green-600/15 hover:bg-green-600/25 border border-green-400/30 text-green-300 text-xs font-medium transition">
              💬 Notificar
            </button>
          )}
          <button type="button" onClick={() => setExpanded((v) => !v)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs transition">
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/10 px-4 py-4 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Servicios</p>
            <div className="space-y-2">
              {(order.items || []).map((it, i) => (
                <div key={i} className="rounded-xl bg-black/20 border border-white/10 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">#{i + 1}</span>
                    <span className="text-white text-sm font-medium">{it.serviceLabel || it.serviceKey}</span>
                    {it.fileName && <span className="ml-auto text-xs text-slate-500 truncate max-w-[150px]">{it.fileName}</span>}
                  </div>
                  {it.options && Object.keys(it.options).length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {Object.entries(it.options).map(([k, v]) => v !== "" && v !== null && v !== undefined && (
                        <div key={k} className="text-[11px]">
                          <span className="text-slate-500">{k}: </span>
                          <span className="text-slate-200">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {it.note && <p className="mt-1 text-xs text-slate-400">📝 {it.note}</p>}
                </div>
              ))}
            </div>
          </div>

          {order.notes && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Instrucciones del cliente</p>
              <p className="text-sm text-slate-200 bg-white/5 rounded-xl px-3 py-2">{order.notes}</p>
            </div>
          )}

          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Cambiar estado manualmente</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {ALL_STATUSES.map((s) => (
                <button key={s} type="button" disabled={s === order.status || updating} onClick={() => handleSetStatus(s)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium border transition disabled:opacity-40 ${
                    s === order.status ? "border-orange-400 text-orange-300 bg-orange-500/20" : "border-white/15 text-slate-300 bg-white/5 hover:bg-white/10"}`}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <input className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-3 py-1.5 text-xs outline-none focus:border-orange-400"
              placeholder="Mensaje personalizado al cliente (opcional)"
              value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
          </div>

          {order.payment_method === "transfer" && order.payment_status === "pending" && (
            <div className="rounded-xl bg-yellow-900/30 border border-yellow-400/20 p-3">
              <p className="text-yellow-200 text-sm font-medium mb-2">⚠️ Pago de transferencia pendiente</p>
              <button type="button" disabled={updating}
                onClick={async () => {
                  setUpdating(true);
                  await supabase.from("orders").update({ payment_status: "approved" }).eq("id", order.id);
                  await updateOrderStatus(order.id, "payment_approved", "Pago confirmado — tu pedido está en cola");
                  setUpdating(false); onStatusChange();
                }}
                className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold transition disabled:opacity-50">
                ✅ Confirmar pago recibido
              </button>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Historial de estados</p>
              <div className="space-y-1">
                {history.map((h) => (
                  <div key={h.id || h.created_at} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="shrink-0">{new Date(h.created_at).toLocaleString("es-MX", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</span>
                    <span>{STATUS_LABELS[h.status] || h.status}</span>
                    {h.message && h.message !== STATUS_LABELS[h.status] && <span className="text-slate-500">— {h.message}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GESTIÓN DE SERVICIOS
// ══════════════════════════════════════════════════════════════════════════════
function AdminServicios() {
  const [servicios, setServicios]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [editingId, setEditingId]   = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("servicios").select("*").order("orden");
    setServicios(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActivo(s) {
    const newVal = !s.activo;
    await supabase.from("servicios").update({ activo: newVal }).eq("id", s.id);
    setServicios((prev) => prev.map((x) => x.id === s.id ? { ...x, activo: newVal } : x));
  }

  function startEdit(s) {
    setEditingId(s.id);
    setEditForm({ nombre: s.nombre, descripcion: s.descripcion, tag: s.tag, desde_precio: s.desde_precio, suspendido_msg: s.suspendido_msg || "" });
    setMsg("");
  }

  async function saveEdit() {
    setSaving(true);
    const { error } = await supabase.from("servicios").update({
      nombre:        editForm.nombre,
      descripcion:   editForm.descripcion,
      tag:           editForm.tag,
      desde_precio:  editForm.desde_precio,
      suspendido_msg: editForm.suspendido_msg || null,
    }).eq("id", editingId);
    setSaving(false);
    if (error) { setMsg("Error: " + error.message); return; }
    setMsg("Guardado correctamente");
    setEditingId(null);
    load();
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-white/20 border-t-orange-400 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      {msg && (
        <div className="rounded-xl bg-green-500/10 border border-green-400/20 px-4 py-2 text-green-300 text-sm">{msg}</div>
      )}

      {servicios.map((s) => (
        <div key={s.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {/* Cabecera del servicio */}
          <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
            {IMG_MAP[s.id] && (
              <img src={IMG_MAP[s.id]} alt={s.nombre} className="w-12 h-12 object-cover rounded-xl shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-semibold text-sm">{s.nombre}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-400">{s.tag}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                  s.activo ? "bg-green-500/15 text-green-300 border-green-400/30" : "bg-red-500/15 text-red-300 border-red-400/30"}`}>
                  {s.activo ? "Activo" : "Suspendido"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{s.descripcion}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.desde_precio}</p>
            </div>

            <div className="flex gap-2 shrink-0">
              {/* Toggle activo/suspendido */}
              <button type="button" onClick={() => toggleActivo(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                  s.activo
                    ? "bg-red-500/15 hover:bg-red-500/25 border-red-400/30 text-red-300"
                    : "bg-green-500/15 hover:bg-green-500/25 border-green-400/30 text-green-300"}`}>
                {s.activo ? "Suspender" : "Activar"}
              </button>
              <button type="button" onClick={() => editingId === s.id ? setEditingId(null) : startEdit(s)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-300 text-xs transition">
                {editingId === s.id ? "Cancelar" : "Editar"}
              </button>
            </div>
          </div>

          {/* Formulario de edición */}
          {editingId === s.id && (
            <div className="border-t border-white/10 px-4 py-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Nombre del servicio</label>
                  <input value={editForm.nombre} onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-3 py-2 text-sm outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Categoría (tag)</label>
                  <input value={editForm.tag} onChange={(e) => setEditForm((f) => ({ ...f, tag: e.target.value }))}
                    className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-3 py-2 text-sm outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Precio referencia (ej: Desde $1.20/hoja)</label>
                  <input value={editForm.desde_precio} onChange={(e) => setEditForm((f) => ({ ...f, desde_precio: e.target.value }))}
                    className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-3 py-2 text-sm outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Mensaje al suspender (opcional)</label>
                  <input value={editForm.suspendido_msg} onChange={(e) => setEditForm((f) => ({ ...f, suspendido_msg: e.target.value }))}
                    placeholder="Temporalmente no disponible"
                    className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-3 py-2 text-sm outline-none focus:border-orange-400" />
                </div>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Descripción</label>
                <textarea value={editForm.descripcion} onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none" />
              </div>
              <button type="button" onClick={saveEdit} disabled={saving}
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

// ══════════════════════════════════════════════════════════════════════════════
// GESTIÓN DE PRECIOS
// ══════════════════════════════════════════════════════════════════════════════
function AdminPrecios() {
  const [precios, setPrecios]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filtro, setFiltro]     = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editPrecio, setEditPrecio] = useState("");
  const [saving, setSaving]     = useState(false);

  // Agrupados por categoría
  const categorias = [...new Set(precios.map((p) => p.categoria_slug))];

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
    setPrecios((prev) => prev.map((p) => p.id === id ? { ...p, precio: val } : p));
  }

  const filtrados = filtro
    ? precios.filter((p) =>
        p.categoria?.toLowerCase().includes(filtro.toLowerCase()) ||
        p.variante?.toLowerCase().includes(filtro.toLowerCase()) ||
        p.formato?.toLowerCase().includes(filtro.toLowerCase())
      )
    : precios;

  const cats = [...new Set(filtrados.map((p) => p.categoria_slug))];

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
          {precios.length === 0
            ? "No hay precios en el catálogo aún. Agrega precios desde la base de datos."
            : "Sin resultados para ese filtro."}
        </div>
      )}

      <div className="space-y-4">
        {cats.map((cat) => {
          const items = filtrados.filter((p) => p.categoria_slug === cat);
          const variantes = [...new Set(items.map((p) => p.variante_slug))];

          return (
            <div key={cat} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">{items[0]?.categoria || cat}</h3>
                <p className="text-xs text-slate-400">{items[0]?.servicio}</p>
              </div>

              {variantes.map((vSlug) => {
                const vItems = items.filter((p) => p.variante_slug === vSlug);
                const formatos = [...new Set(vItems.map((p) => p.formato_slug))];

                return (
                  <div key={vSlug} className="px-4 py-3 border-b border-white/5 last:border-0">
                    <p className="text-xs font-medium text-slate-300 mb-2">{vItems[0]?.variante}</p>
                    {formatos.map((fSlug) => {
                      const fItems = vItems.filter((p) => p.formato_slug === fSlug);
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
                                    <input
                                      type="number" step="0.01" min="0"
                                      value={editPrecio}
                                      onChange={(e) => setEditPrecio(e.target.value)}
                                      className="w-20 rounded-lg bg-white/10 border border-orange-400 text-white px-2 py-0.5 text-xs outline-none"
                                      autoFocus
                                      onKeyDown={(e) => { if (e.key === "Enter") savePrecio(p.id); if (e.key === "Escape") setEditingId(null); }}
                                    />
                                    <button type="button" onClick={() => savePrecio(p.id)} disabled={saving}
                                      className="px-2 py-0.5 rounded-lg bg-orange-500 text-white text-[10px] font-semibold">
                                      {saving ? "…" : "OK"}
                                    </button>
                                    <button type="button" onClick={() => setEditingId(null)}
                                      className="px-2 py-0.5 rounded-lg bg-white/10 text-slate-300 text-[10px]">✕</button>
                                  </div>
                                ) : (
                                  <button type="button"
                                    onClick={() => { setEditingId(p.id); setEditPrecio(String(p.precio)); }}
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

// ══════════════════════════════════════════════════════════════════════════════
// PANEL PRINCIPAL ADMIN
// ══════════════════════════════════════════════════════════════════════════════
export default function Admin() {
  const { loading: adminLoading, isAdmin } = useIsAdmin();
  const [tab, setTab]         = useState("pedidos");
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await fetchAllOrders();
    setLoading(false);
    if (error) { alert(`Error: ${error.message}`); return; }
    setOrders(data || []);
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_status_history" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  if (adminLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/20 border-t-orange-400 rounded-full animate-spin" />
    </div>
  );

  if (!isAdmin) return <Navigate to="/" replace />;

  const filtered = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.customer_name?.toLowerCase().includes(q) || o.customer_phone?.includes(q) || o.id.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
  const pendingPayment = counts["pending_payment"] || 0;
  const active = (counts["payment_approved"] || 0) + (counts["in_progress"] || 0) + (counts["printing"] || 0);
  const readyCount = counts["ready"] || 0;

  const TABS = [
    { id: "pedidos",   label: "Pedidos",   icon: "📋" },
    { id: "servicios", label: "Servicios", icon: "⚙️" },
    { id: "precios",   label: "Precios",   icon: "💲" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Panel Admin</h1>
            <p className="text-slate-400 text-sm mt-0.5">Copy Center 2000</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={load}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs">
              ↻ Actualizar
            </button>
            <button type="button" onClick={() => supabase.auth.signOut()}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs">
              Salir
            </button>
          </div>
        </div>

        {/* KPIs — solo en pedidos */}
        {tab === "pedidos" && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-2xl bg-yellow-500/10 border border-yellow-400/20 p-4 text-center">
              <div className="text-2xl font-bold text-yellow-300">{pendingPayment}</div>
              <div className="text-xs text-slate-400 mt-1">Pendientes de pago</div>
            </div>
            <div className="rounded-2xl bg-orange-500/10 border border-orange-400/20 p-4 text-center">
              <div className="text-2xl font-bold text-orange-300">{active}</div>
              <div className="text-xs text-slate-400 mt-1">En proceso</div>
            </div>
            <div className="rounded-2xl bg-green-500/10 border border-green-400/20 p-4 text-center">
              <div className="text-2xl font-bold text-green-300">{readyCount}</div>
              <div className="text-xs text-slate-400 mt-1">Listos para recoger</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-2xl p-1 border border-white/10">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${
                tab === t.id
                  ? "bg-orange-500 text-white shadow"
                  : "text-slate-400 hover:text-white hover:bg-white/10"}`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── PESTAÑA: PEDIDOS ── */}
        {tab === "pedidos" && (
          <>
            <CopyTicketPanel />

            <div className="flex flex-wrap gap-2 mb-4">
              <input
                className="flex-1 min-w-[180px] rounded-xl bg-white/10 border border-white/20 text-white px-3 py-1.5 text-xs outline-none focus:border-orange-400"
                placeholder="Buscar por nombre, teléfono o ID…"
                value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="flex flex-wrap gap-1">
                {["all", ...ALL_STATUSES].map((s) => (
                  <button key={s} type="button" onClick={() => setFilter(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                      filter === s ? "bg-orange-500/20 border-orange-400/50 text-orange-300" : "bg-white/5 border-white/15 text-slate-400 hover:bg-white/10"}`}>
                    {s === "all" ? `Todos (${orders.length})` : `${STATUS_LABELS[s]} ${counts[s] ? `(${counts[s]})` : ""}`}
                  </button>
                ))}
              </div>
            </div>

            {loading && (
              <div className="flex items-center gap-3 text-slate-400 py-8">
                <div className="w-5 h-5 border-2 border-white/20 border-t-orange-400 rounded-full animate-spin" />
                <span className="text-sm">Cargando pedidos…</span>
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">
                No hay pedidos con ese filtro.
              </div>
            )}
            <div className="space-y-3">
              {filtered.map((order) => (
                <OrderRow key={order.id} order={order} onStatusChange={load} />
              ))}
            </div>
          </>
        )}

        {/* ── PESTAÑA: SERVICIOS ── */}
        {tab === "servicios" && (
          <>
            <div className="rounded-2xl border border-orange-400/20 bg-orange-500/5 px-4 py-3 mb-4">
              <p className="text-sm text-orange-200">
                Aquí puedes <strong>activar, suspender y editar</strong> cada servicio. Los cambios se reflejan inmediatamente en la página de clientes.
              </p>
            </div>
            <AdminServicios />
          </>
        )}

        {/* ── PESTAÑA: PRECIOS ── */}
        {tab === "precios" && (
          <>
            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/5 px-4 py-3 mb-4">
              <p className="text-sm text-blue-200">
                Edita los precios del catálogo haciendo clic en el valor. Los precios aquí son de referencia — para que se apliquen automáticamente en cotizaciones conecta el catálogo a la lógica de precios.
              </p>
            </div>
            <AdminPrecios />
          </>
        )}

      </div>
    </div>
  );
}
