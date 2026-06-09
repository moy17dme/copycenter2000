import { useCallback, useEffect, useRef, useState } from "react";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { LockKeyhole, RotateCcw, Wifi } from "lucide-react";
import { processMercadoPagoCard, queryMercadoPagoCardStatus } from "../lib/orders";
import { fmtMXN } from "../utils/getItemPrice";

const publicKey = (import.meta.env.VITE_MP_PUBLIC_KEY || "").trim();
const MASK_GROUP = "\u2022\u2022\u2022\u2022";
const MASK_CVV = "\u2022\u2022\u2022\u2022";
let mercadoPagoInstancePromise;

async function getMercadoPagoInstance() {
  if (!publicKey) throw new Error("Mercado Pago no esta configurado.");
  if (!mercadoPagoInstancePromise) {
    mercadoPagoInstancePromise = loadMercadoPago().then(() => {
      if (!window.MercadoPago) {
        throw new Error("No se pudo cargar Mercado Pago.");
      }
      return new window.MercadoPago(publicKey, {
        locale: "es-MX",
        advancedFraudPrevention: true,
      });
    });
  }
  return mercadoPagoInstancePromise;
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

function formatCardNumber(value, maxLength = 19) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, maxLength)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiration(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function tokenErrorMessage(error) {
  const cause = error?.cause?.[0]?.code || error?.cause?.[0]?.description;
  const messages = {
    "205": "Escribe el numero de la tarjeta.",
    "208": "Selecciona el mes de vencimiento.",
    "209": "Selecciona el ano de vencimiento.",
    "212": "Escribe el tipo de identificacion.",
    "213": "Escribe el subtipo de identificacion.",
    "214": "Escribe el numero de identificacion.",
    "220": "Escribe el banco emisor.",
    "221": "Escribe el nombre como aparece en la tarjeta.",
    "224": "Escribe el codigo de seguridad.",
    E301: "El numero de tarjeta no es valido.",
    E302: "Revisa el codigo de seguridad.",
    "316": "El nombre del titular no es valido.",
    "322": "Revisa tu identificacion.",
    "323": "Revisa tu identificacion.",
    "324": "Revisa tu identificacion.",
    "325": "El mes de vencimiento no es valido.",
    "326": "El ano de vencimiento no es valido.",
  };
  return messages[cause] || error?.message || "Revisa los datos de la tarjeta.";
}

function AnimatedCardPreview({
  bin,
  lastFour,
  cardholderName,
  expiration,
  cvvDots,
  cvvLength,
  activityKey,
  showBack,
  onFlip,
}) {
  const brand = cardBrandFromBin(bin);
  const maskedLastFour = /^\d{4}$/.test(lastFour || "") ? lastFour : MASK_GROUP;

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
              <span>{MASK_GROUP}</span>
              <span>{MASK_GROUP}</span>
              <span>{MASK_GROUP}</span>
              <span className={lastFour ? "is-known" : ""}>{maskedLastFour}</span>
            </div>

            <div className="mp-card-footer">
              <div>
                <span className="mp-card-label">Titular</span>
                <strong>{cardholderName || "NOMBRE EN TARJETA"}</strong>
              </div>
              <div className="mp-card-expiry">
                <span className="mp-card-label">Vence</span>
                <strong>{expiration || `${MASK_GROUP.slice(0, 2)}/${MASK_GROUP.slice(0, 2)}`}</strong>
              </div>
            </div>
          </div>

          <div className="mp-card-face mp-card-back">
            <div className="mp-card-stripe" />
            <div className="mp-card-signature">
              <span>CVV</span>
              <strong aria-label="CVV oculto">
                {cvvDots || MASK_CVV.slice(0, cvvLength)}
              </strong>
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
        onClick={onFlip}
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
  const [expiration, setExpiration] = useState("");
  const [cvvDots, setCvvDots] = useState("");
  const [activityKey, setActivityKey] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [installmentOptions, setInstallmentOptions] = useState([]);
  const [installments, setInstallments] = useState(1);
  const [cardNumberLength, setCardNumberLength] = useState(16);
  const [cvvLength, setCvvLength] = useState(3);
  const cardNumberRef = useRef(null);
  const expirationRef = useRef(null);
  const cvvRef = useRef(null);
  const latestBinRequest = useRef("");

  useEffect(() => {
    let active = true;
    getMercadoPagoInstance()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((sdkError) => {
        console.error("[checkout] Mercado Pago SDK:", sdkError);
        if (active) setError("No se pudo cargar el pago seguro. Intenta recargar la pagina.");
      });
    return () => {
      active = false;
    };
  }, []);

  const loadPaymentOptions = useCallback(async (nextBin) => {
    if (nextBin.length < 6 || latestBinRequest.current === nextBin) return;
    latestBinRequest.current = nextBin;
    setLoadingOptions(true);
    setError("");

    try {
      const mp = await getMercadoPagoInstance();
      const methodsResponse = await mp.getPaymentMethods({ bin: nextBin });
      if (latestBinRequest.current !== nextBin) return;

      const method = methodsResponse?.results?.find((candidate) => (
        candidate?.status === "active" &&
        ["credit_card", "debit_card", "prepaid_card"].includes(candidate?.payment_type_id)
      ));
      if (!method) {
        setPaymentMethod(null);
        setInstallmentOptions([]);
        setError("Esta tarjeta no esta disponible para pagos en linea.");
        return;
      }

      const settings = method.settings?.[0] || {};
      setPaymentMethod(method);
      setCardNumberLength(Number(settings?.card_number?.length) || 16);
      setCvvLength(Number(settings?.security_code?.length) || 3);

      let normalized = [{ installments: 1, recommended_message: `1 pago de $${fmtMXN(amount)}` }];
      try {
        const installmentsResponse = await mp.getInstallments({
          amount: Number(amount).toFixed(2),
          bin: nextBin,
          paymentMethodId: method.id,
          paymentTypeId: method.payment_type_id,
        });
        if (latestBinRequest.current !== nextBin) return;
        const options = installmentsResponse?.[0]?.payer_costs || [];
        if (options.length > 0) normalized = options;
      } catch (installmentsError) {
        console.warn("[checkout] Sin mensualidades para esta tarjeta:", installmentsError);
      }
      if (latestBinRequest.current !== nextBin) return;
      setInstallmentOptions(normalized);
      setInstallments(Number(normalized[0]?.installments) || 1);
    } catch (optionsError) {
      console.error("[checkout] Opciones de tarjeta:", optionsError);
      setPaymentMethod(null);
      setInstallmentOptions([]);
      setError("No pudimos identificar la tarjeta. Revisa los primeros digitos.");
    } finally {
      if (latestBinRequest.current === nextBin) setLoadingOptions(false);
    }
  }, [amount]);

  const handleCardNumberInput = useCallback((event) => {
    const digits = event.currentTarget.value.replace(/\D/g, "").slice(0, 19);
    event.currentTarget.value = formatCardNumber(digits, cardNumberLength);
    const nextBin = digits.slice(0, 6);
    setBin(nextBin);
    setLastFour(digits.length >= 4 ? digits.slice(-4) : "");
    setActivityKey((current) => current + 1);
    setError("");

    if (nextBin.length === 6) {
      loadPaymentOptions(nextBin);
    } else {
      latestBinRequest.current = "";
      setLoadingOptions(false);
      setPaymentMethod(null);
      setInstallmentOptions([]);
      setInstallments(1);
    }
  }, [cardNumberLength, loadPaymentOptions]);

  const handleExpirationInput = useCallback((event) => {
    const formatted = formatExpiration(event.currentTarget.value);
    event.currentTarget.value = formatted;
    setExpiration(formatted);
    setActivityKey((current) => current + 1);
    setError("");
  }, []);

  const handleCardholderInput = useCallback((event) => {
    const name = event.currentTarget.value.toUpperCase().slice(0, 40);
    event.currentTarget.value = name;
    setCardholderName(name);
    setActivityKey((current) => current + 1);
    setError("");
  }, []);

  const handleCvvInput = useCallback((event) => {
    const digits = event.currentTarget.value.replace(/\D/g, "").slice(0, cvvLength);
    event.currentTarget.value = digits;
    setCvvDots(digits ? MASK_CVV.slice(0, digits.length) : "");
    setShowBack(true);
    setActivityKey((current) => current + 1);
    setError("");
  }, [cvvLength]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (submitting) return;

    const cardNumber = cardNumberRef.current?.value.replace(/\D/g, "") || "";
    const expirationDigits = expirationRef.current?.value.replace(/\D/g, "") || "";
    const securityCode = cvvRef.current?.value.replace(/\D/g, "") || "";
    const month = expirationDigits.slice(0, 2);
    const shortYear = expirationDigits.slice(2, 4);

    if (!paymentMethod || cardNumber.length !== cardNumberLength) {
      setError("Revisa el numero de la tarjeta.");
      cardNumberRef.current?.focus();
      return;
    }
    if (!cardholderName.trim()) {
      setError("Escribe el nombre como aparece en la tarjeta.");
      return;
    }
    if (
      expirationDigits.length !== 4 ||
      Number(month) < 1 ||
      Number(month) > 12
    ) {
      setError("Revisa la fecha de vencimiento.");
      expirationRef.current?.focus();
      return;
    }
    if (securityCode.length !== cvvLength) {
      setError("Revisa el codigo de seguridad.");
      setShowBack(true);
      cvvRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const mp = await getMercadoPagoInstance();
      const token = await mp.createCardToken({
        cardNumber,
        cardholderName: cardholderName.trim(),
        securityCode,
        cardExpirationMonth: month,
        cardExpirationYear: `20${shortYear}`,
      });
      if (!token?.id) {
        throw new Error("Mercado Pago no genero el token de la tarjeta.");
      }

      setLastFour(token?.last_four_digits || cardNumber.slice(-4));
      if (cvvRef.current) cvvRef.current.value = "";
      setCvvDots("");
      setShowBack(false);

      const { data, error: paymentError } = await processMercadoPagoCard({
        orderId: order.id,
        accessToken,
        formData: {
          token: token?.id,
          issuer_id: String(paymentMethod?.issuer?.id || ""),
          payment_method_id: paymentMethod.id,
          payment_type_id: paymentMethod.payment_type_id,
          transaction_amount: Number(amount),
          installments: Number(installments) || 1,
          payer: {
            email: payerEmail,
          },
        },
        paymentTypeId: paymentMethod.payment_type_id,
        attemptId: crypto.randomUUID(),
      });

      if (paymentError) {
        setError(paymentErrorMessage(paymentError));
        return;
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

      setError(
        STATUS_MESSAGES[data?.status_detail] ||
        "El pago fue rechazado. Intenta con otra tarjeta."
      );
    } catch (submitError) {
      console.error("[checkout] Tokenizacion de tarjeta:", submitError);
      setError(tokenErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }, [
    accessToken,
    amount,
    cardNumberLength,
    cardholderName,
    cvvLength,
    installments,
    onApproved,
    onChallenge,
    onPending,
    order.id,
    payerEmail,
    paymentMethod,
    submitting,
  ]);

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
        expiration={expiration}
        cvvDots={cvvDots}
        cvvLength={cvvLength}
        activityKey={activityKey}
        showBack={showBack}
        onFlip={() => setShowBack((current) => !current)}
      />

      {!ready && (
        <div className="h-40 rounded-xl animate-pulse" style={{ backgroundColor: "#1B2433" }} />
      )}

      <form
        className="mp-custom-card-form"
        style={{ display: ready ? "grid" : "none" }}
        onSubmit={handleSubmit}
        autoComplete="on"
      >
        <label className="mp-card-field mp-card-field-wide">
          <span>Numero de tarjeta</span>
          <input
            ref={cardNumberRef}
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            name="cardNumber"
            placeholder="1234 5678 9012 3456"
            maxLength={23}
            onInput={handleCardNumberInput}
            onFocus={() => setShowBack(false)}
          />
        </label>

        <label className="mp-card-field mp-card-field-wide">
          <span>Nombre en la tarjeta</span>
          <input
            type="text"
            autoComplete="cc-name"
            name="cardholderName"
            placeholder="NOMBRE DEL TITULAR"
            maxLength={40}
            onInput={handleCardholderInput}
            onFocus={() => setShowBack(false)}
          />
        </label>

        <label className="mp-card-field">
          <span>Vencimiento</span>
          <input
            ref={expirationRef}
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            name="cardExpiration"
            placeholder="MM/AA"
            maxLength={5}
            onInput={handleExpirationInput}
            onFocus={() => setShowBack(false)}
          />
        </label>

        <label className="mp-card-field">
          <span>CVV</span>
          <input
            ref={cvvRef}
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            name="securityCode"
            placeholder={MASK_CVV.slice(0, cvvLength)}
            maxLength={cvvLength}
            onInput={handleCvvInput}
            onFocus={() => setShowBack(true)}
            onBlur={() => setShowBack(false)}
          />
        </label>

        <label className="mp-card-field mp-card-field-wide">
          <span>Forma de pago</span>
          <select
            value={installments}
            onChange={(event) => setInstallments(Number(event.target.value))}
            disabled={!paymentMethod || loadingOptions}
          >
            {!paymentMethod && <option value={1}>Ingresa una tarjeta valida</option>}
            {loadingOptions && <option value={1}>Consultando opciones...</option>}
            {!loadingOptions && installmentOptions.map((option) => (
              <option key={option.installments} value={option.installments}>
                {option.recommended_message || `${option.installments} mensualidades`}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="mp-card-pay-button"
          disabled={submitting || loadingOptions || !paymentMethod}
        >
          {submitting ? "Procesando pago..." : `Pagar $${fmtMXN(amount)} MXN`}
        </button>

        <p className="mp-card-privacy">
          Mercado Pago tokeniza la tarjeta. Copy Center 2000 no envia el numero ni el CVV a su servidor.
        </p>
      </form>

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
