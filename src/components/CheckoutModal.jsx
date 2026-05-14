// src/components/CheckoutModal.jsx
import { useEffect, useMemo, useState } from "react";
import { useCart } from "./CartContext";
import {
  createOrder,
  uploadOrderFiles,
  buildOrderWhatsAppMessage,
  openWhatsApp,
  SHOP_PHONE,
} from "../lib/orders";
import { getItemPrice, fmtMXN } from "../utils/getItemPrice";

// Datos bancarios del negocio (edita estos valores)
const BANK_INFO = {
  bank:    "BANORTE",
  clabe:   "072290013257279710",
  account: "5264246819447292",
  owner:   "Irene Osorio",
};

const STEPS = {
  FORM:    "form",
  LOADING: "loading",
  SUCCESS: "success",
};

// ── Validaciones ─────────────────────────────────────────────────────────────
function validateName(raw) {
  const name = raw.trim();
  if (!name) return "Por favor ingresa tu nombre completo.";
  if (!/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'.-]+$/.test(name))
    return "El nombre solo puede contener letras.";

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return "Ingresa tu nombre y al menos un apellido.";

  const hasVowel = /[aeiouáéíóúüAEIOUÁÉÍÓÚÜ]/i;

  for (const part of parts) {
    if (part.length < 2) return "Cada parte del nombre debe tener al menos 2 letras.";
    if (!hasVowel.test(part)) return "El nombre no parece ser real. Verifícalo.";

    // Detectar racha de consonantes (más de 4 seguidas = probable basura)
    let streak = 0;
    for (const ch of part) {
      if (/[a-záéíóúüñ]/i.test(ch) && !hasVowel.test(ch)) {
        if (++streak > 4) return "El nombre no parece ser real. Verifícalo.";
      } else {
        streak = 0;
      }
    }

    // Detectar letra repetida ("aaaa", "bbbb")
    if (part.length >= 3 && new Set(part.toLowerCase()).size === 1)
      return "El nombre no parece ser real. Verifícalo.";
  }

  return null;
}

function validatePhone(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return "Por favor ingresa tu teléfono / WhatsApp.";

  if (trimmed.startsWith("+")) {
    // ── Número internacional (E.164) ─────────────────────────────
    // Formato: + código_país (1-3 dígitos) + número (mínimo 4 dígitos)
    // Total dígitos: 7 (mínimo) – 15 (máximo, estándar ITU-T E.164)
    const digits = trimmed.slice(1).replace(/\D/g, "");
    if (digits.length < 7)
      return "Número internacional muy corto. Verifica el código de país y el número.";
    if (digits.length > 15)
      return "Número internacional muy largo (máx. 15 dígitos según estándar ITU).";
    return null;
  }

  // ── Número nacional mexicano ──────────────────────────────────
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length !== 10)
    return `El teléfono debe tener exactamente 10 dígitos (tienes ${digits.length}). Si es de otro país, empieza con +.`;
  return null;
}

export default function CheckoutModal({ open, onClose, user, profile }) {
  const { items, clearCart } = useCart();
  const [step, setStep] = useState(STEPS.FORM);
  const [error, setError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Datos del cliente
  const [name,      setName]      = useState("");
  const [phone,     setPhone]     = useState("");
  const [notes,     setNotes]     = useState("");
  const [payment,   setPayment]   = useState("transfer");
  const [cardOk,    setCardOk]    = useState(false);
  const [nameError, setNameError] = useState("");
  const [phoneError,setPhoneError]= useState("");

  // Pre-llenar desde perfil
  useEffect(() => {
    if (open) {
      setStep(STEPS.FORM);
      setError("");
      setCardOk(false);
      setNameError("");
      setPhoneError("");
      setName(profile?.full_name || user?.user_metadata?.full_name || "");
      setPhone(profile?.phone || user?.user_metadata?.phone || user?.user_metadata?.whatsapp || "");
      setNotes("");
    }
  }, [open, profile, user]);

  // ── orderSummary DEBE ir antes del early return (Reglas de Hooks) ──────────
  const orderSummary = useMemo(() => {
    let sum = 0;
    let hasUnknown = false;
    const lines = items.map((it) => {
      const p = getItemPrice(it);
      if (p !== null) sum += p.total;
      else hasUnknown = true;
      return { it, p };
    });
    return { lines, sum, hasUnknown };
  }, [items]);

  if (!open) return null;

  const hasItems = items.length > 0;

  async function handleConfirm(e) {
    e.preventDefault();
    setError("");

    const nameErr  = validateName(name);
    const phoneErr = validatePhone(phone);

    setNameError(nameErr  || "");
    setPhoneError(phoneErr || "");
    if (nameErr || phoneErr) return;

    if (payment === "card" && !cardOk) {
      setError("Confirma que el pago con tarjeta fue procesado."); return;
    }

    setStep(STEPS.LOADING);

    try {
      // 1. Crear el pedido en Supabase
      const { data: order, error: orderErr } = await createOrder({
        user,
        items,
        customerName:  name.trim(),
        customerPhone: phone.trim(),
        paymentMethod: payment,
        notes:         notes.trim(),
      });

      if (orderErr) {
        setError(`Error al guardar el pedido: ${orderErr.message}`);
        setStep(STEPS.FORM);
        return;
      }

      // 2. Subir archivos (best-effort, no bloquea si falla)
      try {
        await uploadOrderFiles(order.id, items);
      } catch (_) {
        // Silencioso — el pedido ya está guardado
      }

      // 3. Notificar al negocio por WhatsApp
      const msg = buildOrderWhatsAppMessage({ order, isNew: true });
      openWhatsApp(SHOP_PHONE, msg);

      // 4. Éxito
      setConfirmedOrder(order);
      clearCart();
      setStep(STEPS.SUCCESS);
    } catch (err) {
      setError(`Error inesperado: ${err.message}`);
      setStep(STEPS.FORM);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && step !== STEPS.LOADING) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#111827', border: '1px solid #273449' }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #273449' }}>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: '#F5F7FA' }}>Confirmar pedido</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9AA6B2' }}>{items.length} servicio(s) en tu carrito</p>
          </div>
          {step !== STEPS.LOADING && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
              style={{ backgroundColor: 'rgba(27,36,51,0.8)', color: '#9AA6B2' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto max-h-[75vh]">

          {/* ── FORMULARIO ─────────────────────────────── */}
          {step === STEPS.FORM && (
            <form onSubmit={handleConfirm} className="p-6 space-y-5">

              {/* Resumen de servicios con precios */}
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #273449' }}>
                <div className="px-3 py-2" style={{ backgroundColor: '#1B2433', borderBottom: '1px solid #273449' }}>
                  <p className="text-[11px] uppercase tracking-wider" style={{ color: '#9AA6B2' }}>Resumen del pedido</p>
                </div>
                <div className="divide-y" style={{ backgroundColor: 'rgba(27,36,51,0.6)', borderColor: '#273449' }}>
                  {orderSummary.lines.map(({ it, p }, i) => (
                    <div key={it.id || i} className="px-3 py-2 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: 'rgba(31,74,168,0.2)', color: '#4E7BDA' }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] truncate" style={{ color: '#E5ECF6' }}>{it.serviceLabel || it.serviceKey}</p>
                        {it.fileName && (
                          <p className="text-[11px] truncate" style={{ color: '#9AA6B2' }}>{it.fileName}</p>
                        )}
                        {p && (
                          <p className="text-[11px]" style={{ color: '#9AA6B2' }}>{p.label}</p>
                        )}
                      </div>
                      <span className="text-[13px] font-semibold tabular-nums shrink-0"
                        style={{ color: p ? '#34D399' : '#9AA6B2' }}>
                        {p ? `$${fmtMXN(p.total)}` : "cotizar"}
                      </span>
                    </div>
                  ))}
                </div>
                {orderSummary.sum > 0 && (
                  <div className="px-3 py-2 flex items-center justify-between"
                    style={{ backgroundColor: 'rgba(16,185,129,0.06)', borderTop: '1px solid rgba(16,185,129,0.2)' }}>
                    <span className="text-[12px]" style={{ color: '#9AA6B2' }}>
                      {orderSummary.hasUnknown ? "Total parcial estimado" : "Total estimado"}
                    </span>
                    <span className="text-[16px] font-bold tabular-nums" style={{ color: '#34D399' }}>
                      ${fmtMXN(orderSummary.sum)}
                    </span>
                  </div>
                )}
              </div>

              {/* Datos del cliente */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#9AA6B2' }}>Nombre completo *</label>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setNameError(""); }}
                    onBlur={() => { const err = validateName(name); setNameError(err || ""); }}
                    placeholder="Nombre y apellido"
                    style={nameError ? { borderColor: 'rgba(198,28,28,0.7)' } : {}}
                  />
                  {nameError && (
                    <p className="mt-1 text-[11px]" style={{ color: '#F87171' }}>{nameError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#9AA6B2' }}>Teléfono / WhatsApp *</label>
                  <input
                    className="input"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith("+")) {
                        // Internacional: máximo 15 dígitos (estándar ITU E.164)
                        const digits = val.slice(1).replace(/\D/g, "");
                        if (digits.length > 15) return;
                        setPhone("+" + val.slice(1).replace(/[^\d\s\-()]/g, ""));
                      } else {
                        // México: máximo 10 dígitos
                        const digits = val.replace(/\D/g, "");
                        if (digits.length > 10) return;
                        setPhone(val.replace(/[^\d\s\-()]/g, ""));
                      }
                      setPhoneError("");
                    }}
                    onBlur={() => { const err = validatePhone(phone); setPhoneError(err || ""); }}
                    placeholder={phone.startsWith("+") ? "+52 7713531668" : "7713531668"}
                    inputMode="tel"
                    style={phoneError ? { borderColor: 'rgba(198,28,28,0.7)' } : {}}
                  />
                  {phoneError ? (
                    <p className="mt-1 text-[11px]" style={{ color: '#F87171' }}>{phoneError}</p>
                  ) : (
                    <p className="mt-1 text-[11px]" style={{ color: '#6B7280' }}>
                      {phone.startsWith("+")
                        ? "Internacional detectado — ej. +86 13800138000 (China), +1 5550001234 (EE.UU.)"
                        : "Solo México: 10 dígitos · Número de otro país: empieza con +"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#9AA6B2' }}>Instrucciones especiales</label>
                  <textarea
                    rows={3}
                    className="input resize-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Indicaciones adicionales, urgencia, fecha límite, etc."
                  />
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: '#9AA6B2' }}>Método de pago</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "transfer", icon: "🏦", label: "Transferencia", sub: "El pedido inicia al confirmar comprobante" },
                    { key: "card",     icon: "💳", label: "Tarjeta",       sub: "El pedido inicia inmediatamente" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setPayment(opt.key)}
                      className="rounded-2xl p-3 text-left transition"
                      style={payment === opt.key
                        ? { border: '1px solid #1F4AA8', backgroundColor: 'rgba(31,74,168,0.15)', color: '#F5F7FA' }
                        : { border: '1px solid #273449', backgroundColor: '#1B2433', color: '#9AA6B2' }
                      }
                    >
                      <div className="text-base mb-1">{opt.icon}</div>
                      <div className="text-sm font-medium" style={{ color: '#E5ECF6' }}>{opt.label}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: '#9AA6B2' }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info de transferencia */}
              {payment === "transfer" && (
                <div className="rounded-2xl p-4 text-sm space-y-1"
                  style={{ backgroundColor: 'rgba(31,74,168,0.08)', border: '1px solid rgba(31,74,168,0.25)' }}>
                  <p className="font-medium mb-2" style={{ color: '#4E7BDA' }}>Datos para transferencia:</p>
                  <div className="space-y-1" style={{ color: '#9AA6B2' }}>
                    <p>🏦 Banco: <span style={{ color: '#F5F7FA' }}>{BANK_INFO.bank}</span></p>
                    <p>👤 Nombre: <span style={{ color: '#F5F7FA' }}>{BANK_INFO.owner}</span></p>
                    <p>💳 No. de Tarjeta: <span className="font-mono" style={{ color: '#F5F7FA' }}>{BANK_INFO.account}</span></p>
                    <p>🔢 CLABE: <span className="font-mono" style={{ color: '#F5F7FA' }}>{BANK_INFO.clabe}</span></p>
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: '#4E7BDA' }}>
                    Al confirmar, se abrirá WhatsApp. Envía tu comprobante en esa conversación.
                  </p>
                </div>
              )}

              {/* Confirmación de tarjeta */}
              {payment === "card" && (
                <label className="flex items-start gap-3 cursor-pointer rounded-2xl p-3 transition"
                  style={{ border: '1px solid #273449', backgroundColor: '#1B2433' }}>
                  <input
                    type="checkbox"
                    checked={cardOk}
                    onChange={(e) => setCardOk(e.target.checked)}
                    className="mt-1 w-4 h-4 shrink-0 accent-primary"
                  />
                  <span className="text-sm" style={{ color: '#E5ECF6' }}>
                    Confirmo que el pago con tarjeta fue procesado exitosamente en caja y está aprobado.
                  </span>
                </label>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-xl px-3 py-2 text-sm"
                  style={{ backgroundColor: 'rgba(153,27,27,0.15)', border: '1px solid rgba(153,27,27,0.3)', color: '#FCA5A5' }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!hasItems}
                className="w-full py-3 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[.99] disabled:opacity-40"
                style={{ backgroundColor: '#C61C1C', color: '#FFFFFF' }}
              >
                {payment === "card" ? "✅ Confirmar pedido (pago aprobado)" : "📤 Confirmar y enviar por WhatsApp"}
              </button>
            </form>
          )}

          {/* ── CARGANDO ────────────────────────────────── */}
          {step === STEPS.LOADING && (
            <div className="p-10 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 rounded-full animate-spin"
                style={{ borderColor: '#273449', borderTopColor: '#1F4AA8' }} />
              <p className="text-sm" style={{ color: '#9AA6B2' }}>Guardando tu pedido…</p>
            </div>
          )}

          {/* ── ÉXITO ───────────────────────────────────── */}
          {step === STEPS.SUCCESS && confirmedOrder && (
            <div className="p-6 space-y-5 text-center">
              <div className="text-5xl">🎉</div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: '#F5F7FA' }}>¡Pedido confirmado!</h3>
                <p className="text-sm mt-1" style={{ color: '#9AA6B2' }}>
                  #{String(confirmedOrder.id).slice(0, 8).toUpperCase()}
                </p>
              </div>

              {confirmedOrder.payment_method === "transfer" ? (
                <div className="rounded-2xl p-4 text-sm text-left space-y-2"
                  style={{ backgroundColor: 'rgba(31,74,168,0.08)', border: '1px solid rgba(31,74,168,0.25)' }}>
                  <p className="font-medium" style={{ color: '#4E7BDA' }}>¿Qué sigue?</p>
                  <ol className="space-y-1 list-decimal list-inside" style={{ color: '#9AA6B2' }}>
                    <li>Se abrió WhatsApp con los detalles de tu pedido.</li>
                    <li>Realiza la transferencia bancaria.</li>
                    <li>Envía tu <strong style={{ color: '#F5F7FA' }}>comprobante de pago</strong> en esa misma conversación de WhatsApp.</li>
                    <li>En cuanto lo confirmemos, tu pedido iniciará de inmediato.</li>
                  </ol>
                </div>
              ) : (
                <div className="rounded-2xl p-4 text-sm text-left"
                  style={{ backgroundColor: 'rgba(27,36,51,0.8)', border: '1px solid rgba(47,95,193,0.3)' }}>
                  <p className="font-medium" style={{ color: '#4E7BDA' }}>✅ Pago aprobado</p>
                  <p className="mt-1" style={{ color: '#9AA6B2' }}>Tu pedido ya fue recibido y comenzará a procesarse de inmediato.</p>
                </div>
              )}

              <p className="text-xs" style={{ color: '#9AA6B2' }}>
                Puedes ver el estado de tu pedido en <strong style={{ color: '#F5F7FA' }}>Mis Pedidos</strong> desde el menú.
              </p>

              <button
                type="button"
                onClick={() => {
                  const orderId = String(confirmedOrder.id).slice(0, 8).toUpperCase();
                  const msg = encodeURIComponent(
                    `📋 *Resumen de mi pedido #${orderId}*\n` +
                    `Nombre: ${confirmedOrder.customer_name || ""}\n` +
                    `Servicios: ${items.length > 0 ? items.map(it => it.serviceLabel || it.serviceKey).join(", ") : confirmedOrder.items_count + " servicio(s)"}\n` +
                    `Pago: ${confirmedOrder.payment_method === "transfer" ? "Transferencia" : "Tarjeta"}\n` +
                    `Estado: Pendiente de confirmación\n\n` +
                    `Guarda este mensaje como comprobante.`
                  );
                  window.open(`https://wa.me/?text=${msg}`, "_blank");
                }}
                className="w-full py-2.5 rounded-2xl font-medium text-sm transition flex items-center justify-center gap-2"
                style={{ backgroundColor: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)' }}
              >
                💬 Guardar resumen en WhatsApp
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl font-medium text-sm transition"
                style={{ backgroundColor: '#1B2433', color: '#E5ECF6', border: '1px solid #273449' }}
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
