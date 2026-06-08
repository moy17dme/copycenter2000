// src/components/CheckoutModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "./CartContext";
import {
  createOrder,
  createMercadoPagoCheckout,
  uploadOrderFiles,
  uploadConstancia,
  saveProfileBilling,
  attachOrderFiles,
  buildOrderWhatsAppMessage,
  openWhatsApp,
  SHOP_PHONE,
} from "../lib/orders";
import { getItemPrice, fmtMXN } from "../utils/getItemPrice";
import { supabase } from "../lib/supabaseClient";
import { redeemCopyTicket } from "../lib/copyTickets";
import { isTicketRequiredItem } from "../lib/ticketItems";

// Datos bancarios del negocio (edita estos valores)
const BANK_INFO = {
  bank:    "BANORTE",
  clabe:   "072290013257279710",
  account: "5264246819447292",
  owner:   "Irene Osorio",
};

const STEPS = {
  FORM:      "form",
  LOADING:   "loading",
  UPLOADING: "uploading",
  PAYMENT:   "payment",
  SUCCESS:   "success",
};
const UPLOAD_FOREGROUND_BUDGET_MS = 2200;

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

// ── Validar RFC mexicano ─────────────────────────────────────────────────────
function validateRfc(raw) {
  const rfc = raw.trim().toUpperCase();
  if (!rfc) return "El RFC es requerido.";
  // Persona física: 4 letras + 6 dígitos + 3 alfanuméricos = 13 chars
  // Persona moral:  3 letras + 6 dígitos + 3 alfanuméricos = 12 chars
  if (!/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc))
    return "Formato incorrecto. Ejemplo: XAXX010101000 (persona física) o XAX010101000 (empresa).";
  return null;
}

// ── Validar cupón contra Supabase ─────────────────────────────────────────────
async function validateCoupon(code, subtotal) {
  if (!code.trim()) return { valid: false, message: "Ingresa un código." };
  try {
    const { data, error } = await supabase
      .from("cupones")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .eq("active", true)
      .maybeSingle();

    if (error) {
      // La tabla aún no existe u otro error de DB
      return { valid: false, message: "No se pudo verificar el cupón. Intenta de nuevo." };
    }
    if (!data) return { valid: false, message: "Cupón no encontrado o inactivo." };

    // Expiración
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, message: "Este cupón ya expiró." };
    }
    // Usos máximos
    if (data.max_uses !== null && data.uses >= data.max_uses) {
      return { valid: false, message: "Este cupón ya alcanzó su límite de usos." };
    }
    // Monto mínimo
    if (data.min_order && subtotal < data.min_order) {
      return { valid: false, message: `El pedido mínimo para este cupón es $${fmtMXN(data.min_order)}.` };
    }

    const discount = data.type === "percent"
      ? Math.round(subtotal * (data.value / 100) * 100) / 100
      : Math.min(data.value, subtotal);

    return {
      valid: true,
      code: data.code,
      type: data.type,
      value: data.value,
      discount,
      description: data.description || (data.type === "percent" ? `${data.value}% de descuento` : `$${fmtMXN(data.value)} de descuento`),
    };
  } catch {
    return { valid: false, message: "Error al verificar el cupón." };
  }
}

function buildTicketNote(ticketData) {
  if (!ticketData?.code) return "";
  const lines = [`Codigo: ${ticketData.code}`];
  if (ticketData.servicio) lines.push(`Servicio: ${ticketData.servicio}`);
  if (ticketData.descripcion) lines.push(ticketData.descripcion);
  if (ticketData.total != null) lines.push(`Total ticket: $${fmtMXN(ticketData.total)}`);
  return `[Ticket de cobro]\n${lines.join("\n")}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUploadBudget(uploadWork, ms) {
  const result = await Promise.race([
    uploadWork.then(() => ({ timedOut: false })),
    wait(ms).then(() => ({ timedOut: true })),
  ]);
  return result.timedOut;
}

export default function CheckoutModal({ open, onClose, user, session, profile, ticketData }) {
  const { items, clearCart } = useCart();
  const [step, setStep] = useState(STEPS.FORM);
  const [error, setError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [uploadsInBackground, setUploadsInBackground] = useState(false);

  // Datos del cliente
  const [name,      setName]      = useState("");
  const [phone,     setPhone]     = useState("");
  const [notes,     setNotes]     = useState("");
  const [payment,   setPayment]   = useState("transfer");
  const [nameError, setNameError] = useState("");
  const [phoneError,setPhoneError]= useState("");

  // Cupón
  const [couponInput,   setCouponInput]   = useState("");
  const [couponState,   setCouponState]   = useState(null); // { valid, code, discount, description, message }
  const [couponLoading, setCouponLoading] = useState(false);
  const couponApplied = couponState?.valid === true;

  // Facturación
  const [requiresInvoice,      setRequiresInvoice]      = useState(false);
  const [billingRfc,           setBillingRfc]           = useState("");
  const [billingRazonSocial,   setBillingRazonSocial]   = useState("");
  const [billingEmail,         setBillingEmail]         = useState("");
  const [constanciaFile,       setConstanciaFile]       = useState(null);
  const [billingError,         setBillingError]         = useState("");
  const constanciaInputRef = useRef(null);
  const ticketTotal = useMemo(() => {
    const n = Number(ticketData?.total);
    return Number.isFinite(n) ? n : null;
  }, [ticketData?.total]);

  // Pre-llenar desde perfil
  useEffect(() => {
    if (open) {
      setStep(STEPS.FORM);
      setError("");
      setUploadsInBackground(false);
      setNameError("");
      setPhoneError("");
      setCouponInput("");
      setCouponState(null);
      setName(profile?.full_name || user?.user_metadata?.full_name || "");
      setPhone(profile?.phone || user?.user_metadata?.phone || user?.user_metadata?.whatsapp || "");
      setNotes("");
      // Facturación — resetear y pre-llenar si el perfil ya tiene RFC
      setRequiresInvoice(false);
      setBillingRfc(profile?.rfc || "");
      setBillingRazonSocial(profile?.razon_social || "");
      setBillingEmail(user?.email || "");
      setConstanciaFile(null);
      setBillingError("");
    }
  }, [open, profile, user]);

  // ── orderSummary DEBE ir antes del early return (Reglas de Hooks) ──────────
  const orderSummary = useMemo(() => {
    // Detectar si un ítem requiere ticket (copias / escaneos / engargolado)
    const isTicketItem = (it) => {
      return isTicketRequiredItem(it);
    };
    let sum = 0;
    let hasUnknown = false;
    const lines = items.map((it) => {
      // Si hay ticket y este ítem es de copias, usar precio del ticket
      if (ticketTotal != null && isTicketItem(it)) {
        // El ticket cubre todos los ítems de copias en conjunto;
        // lo mostramos solo en el primero para no duplicar
        const isFirst = items.filter(isTicketItem).indexOf(it) === 0;
        if (isFirst) {
          sum += ticketTotal;
          return { it, p: { total: ticketTotal, perUnit: ticketData.precio_unit, qty: ticketData.cantidad, label: ticketData.descripcion || "Precio confirmado por ticket" } };
        }
        return { it, p: null, ticketCovered: true };
      }
      const p = getItemPrice(it);
      if (p !== null) sum += p.total;
      else hasUnknown = true;
      return { it, p };
    });
    const discount = couponApplied ? (couponState.discount || 0) : 0;
    const total = Math.max(0, sum - discount);
    return { lines, sum, hasUnknown, discount, total };
  }, [items, couponApplied, couponState, ticketData, ticketTotal]);

  if (!open) return null;

  const hasItems = items.length > 0;

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    const result = await validateCoupon(couponInput, orderSummary.sum);
    setCouponLoading(false);
    setCouponState(result);
  }

  // ¿El perfil ya tiene RFC guardado?
  const profileSupportsBilling = Boolean(profile?._supportsBillingProfile);
  const hasProfileBilling = profileSupportsBilling && Boolean(profile?.rfc);

  async function handleConfirm(e) {
    e.preventDefault();
    setError("");
    setBillingError("");

    const nameErr  = validateName(name);
    const phoneErr = validatePhone(phone);

    setNameError(nameErr  || "");
    setPhoneError(phoneErr || "");
    if (nameErr || phoneErr) return;

    // Validar facturación
    if (requiresInvoice) {
      const rfcErr = validateRfc(billingRfc);
      if (rfcErr) { setBillingError(rfcErr); return; }
      if (!billingRazonSocial.trim()) {
        setBillingError("La razón social es requerida."); return;
      }
      if (!billingEmail.trim() || !billingEmail.includes("@")) {
        setBillingError("Ingresa un correo válido para recibir la factura."); return;
      }
      if (!hasProfileBilling && !constanciaFile) {
        setBillingError("Adjunta tu Constancia de Situación Fiscal para continuar."); return;
      }
    }

    setStep(STEPS.LOADING);

    try {
      const { data: freshSessionData } = await supabase.auth.getSession();
      const activeSession = freshSessionData?.session || session || null;
      const activeUser = activeSession?.user || user || null;
      const accessToken = activeSession?.access_token || null;

      if (payment === "mercadopago" && (!activeUser?.id || !accessToken)) {
        setError("Inicia sesion para pagar en linea con Mercado Pago.");
        setStep(STEPS.FORM);
        return;
      }

      let redeemedTicket = null;
      if (ticketData?.code) {
        redeemedTicket = await redeemCopyTicket(ticketData.code);
        if (!redeemedTicket.valid) {
          setError(redeemedTicket.reason || "El ticket ya no esta disponible. Pide un codigo nuevo.");
          setStep(STEPS.FORM);
          return;
        }
      }

      // 1. Crear el pedido en Supabase
      console.log("[checkout] Iniciando createOrder...");
      const toMoney = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
      };
      const pricedItems = orderSummary.lines.map(({ it, p }) => ({
        ...it,
        pricing: p
          ? {
              currency: "MXN",
              total: toMoney(p.total),
              perUnit: toMoney(p.perUnit),
              qty: p.qty,
              label: p.label,
            }
          : null,
      }));
      // Preparar billing_info si se requirió factura
      const billingInfo = requiresInvoice
        ? {
            requiresInvoice: true,
            rfc:         billingRfc.trim().toUpperCase(),
            razonSocial: billingRazonSocial.trim(),
            email:       billingEmail.trim(),
          }
        : null;

      const { data: order, error: orderErr } = await createOrder({
        user:          activeUser,
        accessToken,
        items:         pricedItems,
        customerName:  name.trim(),
        customerPhone: phone.trim(),
        paymentMethod: payment,
        notes:         [notes.trim(), buildTicketNote(redeemedTicket || ticketData)].filter(Boolean).join("\n"),
        couponCode:    couponApplied ? couponState.code : null,
        discount:      couponApplied ? couponState.discount : 0,
        subtotal:      orderSummary.sum,
        total:         orderSummary.total,
        billingInfo,
      });
      console.log("[checkout] createOrder resultado:", { order, orderErr });

      if (orderErr) {
        setError(`Error al guardar el pedido: ${orderErr.message}`);
        setStep(STEPS.FORM);
        return;
      }

      if (!order) {
        setError("No se pudo crear el pedido. Verifica la conexión e intenta de nuevo.");
        setStep(STEPS.FORM);
        return;
      }

      // 2. Subir archivos — esperar a que terminen antes de mostrar éxito
      const hasFiles = items.some((it) => it.file || it.pdfFile || it.fileObject || it.blob);
      const mustFinishUploads = payment === "mercadopago";
      if (hasFiles || (requiresInvoice && constanciaFile)) {
        setStep(STEPS.UPLOADING);
        const uploadTasks = [];

        if (hasFiles) {
          uploadTasks.push(uploadOrderFiles(order.id, items, { accessToken }));
        }

        if (requiresInvoice && constanciaFile) {
          uploadTasks.push((async () => {
            const constanciaPath = await uploadConstancia(
              order.id, activeUser?.id, constanciaFile, { accessToken }
            );

            if (activeUser?.id && profileSupportsBilling) {
              await saveProfileBilling({
                userId: activeUser.id,
                rfc:           billingRfc.trim().toUpperCase(),
                razonSocial:   billingRazonSocial.trim(),
                constanciaPath,
                accessToken,
              });
            }

            return constanciaPath
              ? {
                  path: constanciaPath,
                  originalName: constanciaFile.name || "constancia.pdf",
                  size: constanciaFile.size || null,
                  type: "constancia_fiscal",
                }
              : null;
          })());
        }

        const uploadWork = Promise.allSettled(uploadTasks).then(async (results) => {
          const failed = results.filter((result) => result.status === "rejected");
          const uploadedFiles = results.flatMap((result) => {
            if (result.status !== "fulfilled" || !result.value) return [];
            return Array.isArray(result.value) ? result.value : [result.value];
          });

          if (uploadedFiles.length) {
            await attachOrderFiles(order.id, uploadedFiles, { accessToken });
          }

          if (failed.length) {
            console.warn("[checkout] Algunas subidas no terminaron:", failed);
          }
        });

        if (mustFinishUploads) {
          await uploadWork;
          setUploadsInBackground(false);
        } else {
          const uploadTimedOut = await waitForUploadBudget(uploadWork, UPLOAD_FOREGROUND_BUDGET_MS);
          setUploadsInBackground(uploadTimedOut);
          if (uploadTimedOut) {
            console.warn("[checkout] Storage tardó demasiado; se continúa con el pedido y las subidas quedan en segundo plano.");
          }
        }
      } else if (requiresInvoice && activeUser?.id && hasProfileBilling && profileSupportsBilling) {
        // Guardar cambios al RFC/razón social en background — no bloquea
        saveProfileBilling({
          userId: activeUser.id,
          rfc:         billingRfc.trim().toUpperCase(),
          razonSocial: billingRazonSocial.trim(),
          accessToken,
        }).catch(() => {});
      }

      if (payment === "mercadopago") {
        setStep(STEPS.PAYMENT);

        const { data: paymentData, error: paymentErr } = await createMercadoPagoCheckout({
          orderId: order.id,
          accessToken,
        });

        if (paymentErr) {
          const reason = paymentErr?.payload?.error || paymentErr?.payload?.code;
          const isQuoteRequired = reason === "quote_required";
          const message = isQuoteRequired
            ? "Este pedido necesita cotizacion antes de pagar en linea. Ya quedo registrado y te contactaremos para confirmar el total."
            : `Pedido registrado, pero no se pudo abrir Mercado Pago: ${paymentErr.message}`;

          setError(message);
          setConfirmedOrder(order);
          clearCart();
          setStep(STEPS.SUCCESS);

          const msg = buildOrderWhatsAppMessage({ order, isNew: true });
          openWhatsApp(SHOP_PHONE, msg);
          return;
        }

        const checkoutUrl = paymentData?.checkout_url || paymentData?.init_point || paymentData?.sandbox_init_point;
        if (!checkoutUrl) {
          setError("Pedido registrado, pero Mercado Pago no devolvio un link de pago. Contacta al negocio para completar el pago.");
          setConfirmedOrder(order);
          clearCart();
          setStep(STEPS.SUCCESS);

          const msg = buildOrderWhatsAppMessage({ order, isNew: true });
          openWhatsApp(SHOP_PHONE, msg);
          return;
        }

        clearCart();
        window.location.assign(checkoutUrl);
        return;
      }

      // 3. Éxito — el pedido y los archivos ya están registrados
      setConfirmedOrder(order);
      clearCart();
      setStep(STEPS.SUCCESS);

      // 4. Notificar al negocio por WhatsApp
      const msg = buildOrderWhatsAppMessage({ order, isNew: true });
      openWhatsApp(SHOP_PHONE, msg);

    } catch (err) {
      console.error("[checkout] Error inesperado:", err);
      setError(`Error: ${err.message}`);
      setStep(STEPS.FORM);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        const isBusy = step === STEPS.LOADING || step === STEPS.UPLOADING || step === STEPS.PAYMENT;
        if (e.target === e.currentTarget && !isBusy) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#111827', border: '1px solid #273449' }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #273449' }}>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: '#F5F7FA' }}>Confirmar pedido</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9AA6B2' }}>{items.length} servicio(s) en tu carrito</p>
          </div>
          {step !== STEPS.LOADING && step !== STEPS.UPLOADING && step !== STEPS.PAYMENT && (
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
                  {orderSummary.lines.map(({ it, p, ticketCovered }, i) => (
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
                        {p && !ticketCovered && (
                          <p className="text-[11px]" style={{ color: '#9AA6B2' }}>{p.label}</p>
                        )}
                        {ticketCovered && (
                          <p className="text-[11px]" style={{ color: '#6B7280' }}>🎫 incluido en ticket</p>
                        )}
                      </div>
                      <span className="text-[13px] font-semibold tabular-nums shrink-0"
                        style={{ color: ticketCovered ? '#6B7280' : p ? '#34D399' : '#9AA6B2' }}>
                        {ticketCovered ? "—" : p ? `$${fmtMXN(p.total)}` : "cotizar"}
                      </span>
                    </div>
                  ))}
                </div>
                {orderSummary.sum > 0 && (
                  <>
                    {couponApplied && (
                      <div className="px-3 py-2 flex items-center justify-between"
                        style={{ backgroundColor: 'rgba(16,185,129,0.04)', borderTop: '1px solid rgba(16,185,129,0.1)' }}>
                        <span className="text-[12px]" style={{ color: '#9AA6B2' }}>Subtotal</span>
                        <span className="text-[13px] tabular-nums line-through" style={{ color: '#6B7280' }}>
                          ${fmtMXN(orderSummary.sum)}
                        </span>
                      </div>
                    )}
                    {couponApplied && (
                      <div className="px-3 py-2 flex items-center justify-between"
                        style={{ backgroundColor: 'rgba(16,185,129,0.06)' }}>
                        <span className="text-[12px] flex items-center gap-1" style={{ color: '#34D399' }}>
                          🎟️ {couponState.description}
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums" style={{ color: '#34D399' }}>
                          −${fmtMXN(orderSummary.discount)}
                        </span>
                      </div>
                    )}
                    <div className="px-3 py-2 flex items-center justify-between"
                      style={{ backgroundColor: 'rgba(16,185,129,0.06)', borderTop: '1px solid rgba(16,185,129,0.2)' }}>
                      <span className="text-[12px]" style={{ color: '#9AA6B2' }}>
                        {orderSummary.hasUnknown ? "Total parcial estimado" : "Total estimado"}
                      </span>
                      <span className="text-[16px] font-bold tabular-nums" style={{ color: '#34D399' }}>
                        ${fmtMXN(couponApplied ? orderSummary.total : orderSummary.sum)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Cupón de descuento */}
              <div>
                <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: '#9AA6B2' }}>
                  ¿Tienes un cupón?
                </p>
                {!couponApplied ? (
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponState(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon(); }}}
                      placeholder="CÓDIGO"
                      maxLength={30}
                      className="flex-1 rounded-xl px-3 py-2 text-sm font-mono outline-none tracking-widest"
                      style={{ backgroundColor: '#1B2433', border: '1px solid #273449', color: '#F5F7FA' }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-40"
                      style={{ backgroundColor: 'rgba(31,74,168,0.2)', border: '1px solid rgba(31,74,168,0.4)', color: '#4E7BDA' }}
                    >
                      {couponLoading ? "…" : "Aplicar"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <span className="text-sm font-mono font-semibold" style={{ color: '#34D399' }}>
                      🎟️ {couponState.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setCouponState(null); setCouponInput(""); }}
                      className="text-xs px-2 py-1 rounded-lg transition"
                      style={{ color: '#9AA6B2', backgroundColor: 'rgba(255,255,255,0.05)' }}
                    >
                      Quitar
                    </button>
                  </div>
                )}
                {couponState && !couponState.valid && (
                  <p className="mt-1 text-[11px]" style={{ color: '#F87171' }}>
                    {couponState.message}
                  </p>
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
                    { key: "mercadopago", icon: "💳", label: "Pago en linea", sub: "Mercado Pago valida el total" },
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

              {/* Pago en linea */}
              {payment === "mercadopago" && (
                <div className="rounded-2xl p-3 text-sm"
                  style={{ border: '1px solid #273449', backgroundColor: '#1B2433' }}>
                  <p className="font-medium" style={{ color: '#E5ECF6' }}>
                    Pago en linea con Mercado Pago
                  </p>
                  <p className="mt-1 text-xs" style={{ color: '#9AA6B2' }}>
                    Al confirmar, el backend recalcula el total y te envia al checkout seguro para pagar.
                  </p>
                  {orderSummary.hasUnknown && (
                    <p className="mt-2 text-[11px]" style={{ color: '#FCD34D' }}>
                      Este pedido incluye servicios por cotizar. Si no hay precio calculable, quedara registrado y te contactaremos antes de cobrar.
                    </p>
                  )}
                </div>
              )}

              {/* ── FACTURACIÓN ─────────────────────────────── */}
              <div>
                {/* Toggle */}
                <label className="flex items-center gap-3 cursor-pointer rounded-2xl px-3 py-2.5 transition"
                  style={{ border: '1px solid #273449', backgroundColor: requiresInvoice ? 'rgba(31,74,168,0.08)' : '#1B2433' }}>
                  <div
                    onClick={() => { setRequiresInvoice((v) => !v); setBillingError(""); }}
                    className="relative shrink-0 w-9 h-5 rounded-full transition-colors cursor-pointer"
                    style={{ backgroundColor: requiresInvoice ? '#1F4AA8' : '#273449' }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                      style={{ transform: requiresInvoice ? 'translateX(16px)' : 'translateX(0)' }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#E5ECF6' }}>¿Requieres factura?</p>
                    <p className="text-[11px]" style={{ color: '#6B7280' }}>Factura CFDI al correo indicado</p>
                  </div>
                </label>

                {requiresInvoice && (
                  <div className="mt-3 rounded-2xl p-4 space-y-3"
                    style={{ backgroundColor: 'rgba(31,74,168,0.06)', border: '1px solid rgba(31,74,168,0.2)' }}>

                    {hasProfileBilling && (
                      <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                        style={{ backgroundColor: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span className="text-lg">✅</span>
                        <div>
                          <p className="text-[12px] font-medium" style={{ color: '#34D399' }}>Datos fiscales registrados</p>
                          <p className="text-[10px]" style={{ color: '#6B7280' }}>Solo confirma o edita si es necesario</p>
                        </div>
                      </div>
                    )}

                    {!hasProfileBilling && (
                      <div className="rounded-xl px-3 py-2 flex items-start gap-2"
                        style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <span className="text-sm mt-0.5">📋</span>
                        <p className="text-[11px]" style={{ color: '#FCD34D' }}>
                          Primera vez — necesitamos tus datos fiscales y tu Constancia de Situación Fiscal.
                          Estos quedarán guardados para futuros pedidos.
                        </p>
                      </div>
                    )}

                    {/* RFC y Razón Social */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] mb-1" style={{ color: '#9AA6B2' }}>RFC *</label>
                        <input
                          className="input text-xs font-mono uppercase tracking-wide"
                          value={billingRfc}
                          maxLength={13}
                          onChange={(e) => { setBillingRfc(e.target.value.toUpperCase()); setBillingError(""); }}
                          placeholder="XAXX010101000"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] mb-1" style={{ color: '#9AA6B2' }}>Razón Social *</label>
                        <input
                          className="input text-xs"
                          value={billingRazonSocial}
                          onChange={(e) => { setBillingRazonSocial(e.target.value); setBillingError(""); }}
                          placeholder="Empresa S.A. o nombre"
                        />
                      </div>
                    </div>

                    {/* Correo */}
                    <div>
                      <label className="block text-[11px] mb-1" style={{ color: '#9AA6B2' }}>
                        Correo para recibir factura *
                      </label>
                      <input
                        type="email"
                        className="input text-sm"
                        value={billingEmail}
                        onChange={(e) => { setBillingEmail(e.target.value); setBillingError(""); }}
                        placeholder="facturacion@empresa.com"
                      />
                    </div>

                    {/* Constancia — solo si no tiene RFC guardado */}
                    {!hasProfileBilling && (
                      <div>
                        <label className="block text-[11px] mb-1" style={{ color: '#9AA6B2' }}>
                          Constancia de Situación Fiscal *
                          <span className="ml-1" style={{ color: '#6B7280' }}>(PDF)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => constanciaInputRef.current?.click()}
                          className="w-full rounded-xl px-3 py-2 text-sm text-left transition"
                          style={{
                            border: constanciaFile
                              ? '1px solid rgba(16,185,129,0.4)'
                              : '1px dashed #273449',
                            backgroundColor: constanciaFile
                              ? 'rgba(16,185,129,0.06)'
                              : 'rgba(27,36,51,0.8)',
                            color: constanciaFile ? '#34D399' : '#9AA6B2',
                          }}
                        >
                          {constanciaFile ? (
                            <span className="flex items-center gap-2">
                              <span>📄</span>
                              <span className="truncate">{constanciaFile.name}</span>
                              <span className="ml-auto text-xs shrink-0" style={{ color: '#34D399' }}>
                                {(constanciaFile.size / 1024).toFixed(0)} KB
                              </span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <span>📎</span>
                              <span>Seleccionar constancia.pdf</span>
                            </span>
                          )}
                        </button>
                        <input
                          ref={constanciaInputRef}
                          type="file"
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) { setConstanciaFile(f); setBillingError(""); }
                          }}
                        />
                        {constanciaFile && (
                          <button
                            type="button"
                            onClick={() => { setConstanciaFile(null); if (constanciaInputRef.current) constanciaInputRef.current.value = ""; }}
                            className="mt-1 text-[11px] transition"
                            style={{ color: '#6B7280' }}
                          >
                            ✕ Quitar archivo
                          </button>
                        )}
                      </div>
                    )}

                    {/* Error de facturación */}
                    {billingError && (
                      <p className="text-[11px]" style={{ color: '#F87171' }}>⚠️ {billingError}</p>
                    )}
                  </div>
                )}
              </div>

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
                {payment === "mercadopago" ? "Pagar en linea con Mercado Pago" : "📤 Confirmar y enviar por WhatsApp"}
              </button>
            </form>
          )}

          {/* ── CARGANDO ────────────────────────────────── */}
          {(step === STEPS.LOADING || step === STEPS.UPLOADING || step === STEPS.PAYMENT) && (
            <div className="p-10 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 rounded-full animate-spin"
                style={{ borderColor: '#273449', borderTopColor: '#1F4AA8' }} />
              {step === STEPS.PAYMENT ? (
                <>
                  <p className="text-sm" style={{ color: '#9AA6B2' }}>Preparando pago seguro...</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Validando el total con el backend</p>
                </>
              ) : step === STEPS.UPLOADING ? (
                <>
                  <p className="text-sm" style={{ color: '#9AA6B2' }}>Subiendo tus archivos…</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Esto puede tardar unos segundos según el tamaño</p>
                </>
              ) : (
                <>
                  <p className="text-sm" style={{ color: '#9AA6B2' }}>Registrando tu pedido…</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Esto toma solo unos segundos</p>
                </>
              )}
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

              {error && (
                <div className="rounded-2xl p-3 text-sm text-left"
                  style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#FCD34D' }}>
                  {error}
                </div>
              )}

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
                  <p className="font-medium" style={{ color: '#4E7BDA' }}>Pago pendiente de confirmacion</p>
                  <p className="mt-1" style={{ color: '#9AA6B2' }}>Tu pedido ya fue recibido. Iniciara cuando el negocio confirme el pago.</p>
                </div>
              )}

              {uploadsInBackground && (
                <div className="rounded-2xl p-3 text-xs text-left"
                  style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#FCD34D' }}>
                  Tu pedido ya quedo registrado. Los archivos pesados pueden seguir subiendo unos momentos en segundo plano.
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
                    `Pago: ${confirmedOrder.payment_method === "transfer" ? "Transferencia" : "Mercado Pago"}\n` +
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
