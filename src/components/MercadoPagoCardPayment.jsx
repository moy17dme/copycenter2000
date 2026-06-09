import { useCallback, useEffect, useMemo, useState } from "react";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { LockKeyhole, RotateCcw, Wifi } from "lucide-react";
import { processMercadoPagoCard, queryMercadoPagoCardStatus } from "../lib/orders";
import { fmtMXN } from "../utils/getItemPrice";

const publicKey = (import.meta.env.VITE_MP_PUBLIC_KEY || "").trim();
if (publicKey) {
  initMercadoPago(publicKey, { locale: "es-MX" });
}

const STATUS_MESSAGES = {
  bad_filled_card_data: "Revisa los datos de la tarjeta.",
  invalid_card_token: "Los datos de la tarjeta expiraron. Vuelve a capturarlos.",
  high_risk: "Mercado Pago rechazo la operacion por seguridad.",
  rejected_by_issuer: "El banco rechazo el pago. Intenta con otra tarjeta.",
  required_call_for_authorize: "Comunicate con tu banco para autorizar la compra.",
  max_attempts_exceeded: "Se alcanzo el limite de intentos para esta tarjeta.",
  card_disabled: "La tarjeta esta deshabilitada. Usa otro medio de pago.",
  insufficient_amount: "La tarjeta no tiene fondos suficientes.",
  card_insufficient_amount: "La tarjeta no tiene fondos suficientes.",
  amount_limit_exceeded: "El importe supera el limite permitido por la tarjeta.",
  invalid_installments: "Las mensualidades seleccionadas no estan disponibles.",
  processing_error: "Mercado Pago no pudo procesar la tarjeta. Intenta nuevamente.",
  failed: "El pago fue rechazado. Intenta con otra tarjeta.",
};

function paymentErrorMessage(error) {
  const payload = error?.payload || {};
  const detail =
    payload?.status_detail ||
    payload?.detail?.status_detail ||
    payload?.detail?.errors?.[0]?.code ||
    payload?.detail?.errors?.[0]?.message ||
    payload?.error;
  return STATUS_MESSAGES[detail] || payload?.message || error?.message || "No se pudo procesar el pago.";
}

function cardBrandFromBin(bin) {
  if (/^4/.test(bin)) return "VISA";
  if (/^3[47]/.test(bin)) return "AMEX";
  if (/^(5[1-5]|2(2[2-9]|[3-6]|7[01]|720))/.test(bin)) return "MASTERCARD";
  return "TARJETA";
}

function AnimatedCardPreview({
  bin,
  lastFour,
  cardholderName,
  activityKey,
}) {
  const [showBack, setShowBack] = useState(false);
  const brand = cardBrandFromBin(bin);
  const maskedLastFour = /^\d{4}$/.test(lastFour || "") ? lastFour : "••••";

  return (
    <div className="mp-card-preview-shell">
      <div className="mp-card-stage">
        <div
          key={activityKey}
          className={`mp-card-activity ${showBack ? "is-flipped" : ""}`}
        >
          <div className="mp-card-face mp-card-front">
            <div className="mp-card-topline">
              <span className="mp-card-brand">{brand}</span>
              <Wifi aria-hidden="true" size={20} className="mp-card-contactless" />
            </div>

            <div className="mp-card-chip" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <div className="mp-card-number" aria-label={`Tarjeta terminada en ${maskedLastFour}`}>
              <span>••••</span>
              <span>••••</span>
              <span>••••</span>
              <span className={lastFour ? "is-known" : ""}>{maskedLastFour}</span>
            </div>

            <div className="mp-card-footer">
              <div>
                <span className="mp-card-label">Titular</span>
                <strong>{cardholderName || "NOMBRE EN TARJETA"}</strong>
              </div>
              <div className="mp-card-expiry">
                <span className="mp-card-label">Vence</span>
                <strong>••/••</strong>
              </div>
            </div>
          </div>

          <div className="mp-card-face mp-card-back">
            <div className="mp-card-stripe" />
            <div className="mp-card-signature">
              <span>CVV</span>
              <strong aria-label="CVV oculto">•••</strong>
            </div>
            <div className="mp-card-security">
              <LockKeyhole aria-hidden="true" size={15} />
              <span>El codigo permanece cifrado y oculto</span>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowBack((current) => !current)}
        className="mp-card-flip-button"
        aria-label={showBack ? "Mostrar frente de la tarjeta" : "Mostrar ubicacion del CVV"}
        title={showBack ? "Mostrar frente" : "Mostrar CVV"}
      >
        <RotateCcw aria-hidden="true" size={15} />
        <span>{showBack ? "Ver tarjeta" : "Ver ubicacion del CVV"}</span>
      </button>
    </div>
  );
}

export default function MercadoPagoCardPayment({
  order,
  amount,
  accessToken,
  payerEmail,
  onApproved,
  onPending,
  onChallenge,
  onFallback,
  forceFallback = false,
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [bin, setBin] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [activityKey, setActivityKey] = useState(0);

  const initialization = useMemo(() => ({
    amount,
    payer: payerEmail ? { email: payerEmail } : undefined,
  }), [amount, payerEmail]);

  const customization = useMemo(() => ({
    paymentMethods: {
      minInstallments: 1,
      maxInstallments: 12,
      types: {
        included: ["credit_card", "debit_card", "prepaid_card"],
      },
    },
    visual: {
      style: {
        theme: "dark",
      },
    },
  }), []);

  const handleSubmit = useCallback(async (formData, additionalData) => {
    setError("");
    setLastFour(additionalData?.lastFourDigits || "");
    setCardholderName(additionalData?.cardholderName || "");
    setActivityKey((current) => current + 1);
    const { data, error: paymentError } = await processMercadoPagoCard({
      orderId: order.id,
      accessToken,
      formData,
      paymentTypeId: additionalData?.paymentTypeId,
      attemptId: crypto.randomUUID(),
    });

    if (paymentError) {
      const message = paymentErrorMessage(paymentError);
      setError(message);
      throw new Error(message);
    }

    if (data?.challenge_url) {
      onChallenge(data);
      return;
    }
    if (data?.approved) {
      onApproved(data);
      return;
    }
    if (["processing", "created", "action_required"].includes(data?.status)) {
      onPending(data);
      return;
    }

    const message = STATUS_MESSAGES[data?.status_detail] || "El pago fue rechazado. Intenta con otra tarjeta.";
    setError(message);
    throw new Error(message);
  }, [accessToken, onApproved, onChallenge, onPending, order.id]);

  const handleBinChange = useCallback((nextBin) => {
    setBin(nextBin || "");
    setActivityKey((current) => current + 1);
  }, []);

  if (!publicKey || forceFallback) {
    return (
      <div className="space-y-4">
        <div
          className="rounded-xl px-3 py-3 text-sm"
          style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#FCD34D" }}
        >
          El formulario de tarjeta aun no esta habilitado en este ambiente.
        </div>
        <button
          type="button"
          onClick={onFallback}
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition"
          style={{ backgroundColor: "#1F4AA8", color: "#F5F7FA" }}
        >
          Continuar en el sitio seguro de Mercado Pago
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: "#F5F7FA" }}>Pago con tarjeta</p>
          <p className="text-xs mt-0.5" style={{ color: "#9AA6B2" }}>
            Total protegido por Mercado Pago
          </p>
        </div>
        <span className="text-lg font-bold tabular-nums" style={{ color: "#34D399" }}>
          ${fmtMXN(amount)}
        </span>
      </div>

      <AnimatedCardPreview
        bin={bin}
        lastFour={lastFour}
        cardholderName={cardholderName}
        activityKey={activityKey}
      />

      {!ready && (
        <div className="h-40 rounded-xl animate-pulse" style={{ backgroundColor: "#1B2433" }} />
      )}

      <div style={{ display: ready ? "block" : "none" }}>
        <CardPayment
          initialization={initialization}
          customization={customization}
          locale="es-MX"
          onReady={() => setReady(true)}
          onBinChange={handleBinChange}
          onError={(brickError) => {
            console.error("[checkout] Mercado Pago Brick:", brickError);
            setError("No se pudo cargar el formulario de tarjeta.");
          }}
          onSubmit={handleSubmit}
        />
      </div>

      {error && (
        <div
          className="rounded-xl px-3 py-2 text-sm"
          style={{ backgroundColor: "rgba(153,27,27,0.15)", border: "1px solid rgba(153,27,27,0.3)", color: "#FCA5A5" }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onFallback}
        className="w-full text-xs transition hover:underline"
        style={{ color: "#9AA6B2" }}
      >
        ¿Problemas con la tarjeta? Abrir Checkout Pro
      </button>
    </div>
  );
}

export function MercadoPagoChallenge({
  challengeUrl,
  order,
  accessToken,
  onApproved,
  onPending,
  onFailed,
}) {
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    async function handleMessage(event) {
      if (event?.data?.status !== "COMPLETE" || checking) return;
      setChecking(true);

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const { data, error } = await queryMercadoPagoCardStatus({
          orderId: order.id,
          accessToken,
        });
        if (error) {
          onFailed(paymentErrorMessage(error));
          return;
        }
        if (data?.approved) {
          onApproved(data);
          return;
        }
        if (["failed", "canceled", "expired"].includes(data?.status)) {
          onFailed(STATUS_MESSAGES[data?.status_detail] || "La autenticacion bancaria no fue aprobada.");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      onPending({ status: "processing", status_detail: "in_process" });
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [accessToken, checking, onApproved, onFailed, onPending, order.id]);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold" style={{ color: "#F5F7FA" }}>Confirma con tu banco</p>
        <p className="text-xs mt-1" style={{ color: "#9AA6B2" }}>
          Completa la verificacion sin cerrar esta ventana.
        </p>
      </div>
      <iframe
        title="Verificacion de seguridad del banco"
        src={challengeUrl}
        className="w-full rounded-xl bg-white"
        style={{ minHeight: 430, border: "1px solid #273449" }}
        allow="payment"
      />
      {checking && (
        <p className="text-xs text-center" style={{ color: "#9AA6B2" }}>
          Verificando el resultado del pago...
        </p>
      )}
    </div>
  );
}
