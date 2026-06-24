export const MERCADO_PAGO_COMMISSION_RATE = 0.035;
export const MERCADO_PAGO_FIXED_FEE_MXN = 4;
export const IVA_RATE = 0.16;
export const TRANSFER_DISCOUNT_RATE = 0.04;

function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function getPaymentBaseAmount(subtotal, discount = 0) {
  return Math.max(0, roundMoney(subtotal) - roundMoney(discount));
}

export function emptyPaymentAdjustment(paymentMethod = "") {
  return {
    method: String(paymentMethod || ""),
    type: "none",
    label: "Sin ajuste por metodo de pago",
    amount: 0,
  };
}

export function calculatePaymentAdjustment(paymentMethod, baseAmount) {
  const method = String(paymentMethod || "").toLowerCase();
  const base = roundMoney(baseAmount);
  if (base <= 0) return emptyPaymentAdjustment(method);

  if (method === "mercadopago" || method === "card") {
    const feeBeforeIva = roundMoney(base * MERCADO_PAGO_COMMISSION_RATE + MERCADO_PAGO_FIXED_FEE_MXN);
    const iva = roundMoney(feeBeforeIva * IVA_RATE);
    return {
      method: "mercadopago",
      type: "fee",
      label: "Comision Mercado Pago (3.5% + $4 + IVA)",
      amount: roundMoney(feeBeforeIva + iva),
      rate: MERCADO_PAGO_COMMISSION_RATE,
      fixedFee: MERCADO_PAGO_FIXED_FEE_MXN,
      ivaRate: IVA_RATE,
      feeBeforeIva,
      iva,
    };
  }

  if (method === "transfer" || method === "transferencia") {
    const discount = roundMoney(base * TRANSFER_DISCOUNT_RATE);
    return {
      method: "transfer",
      type: "discount",
      label: "Descuento por transferencia (4%)",
      amount: -discount,
      rate: TRANSFER_DISCOUNT_RATE,
    };
  }

  return emptyPaymentAdjustment(method);
}

export function calculatePaymentTotal({ subtotal, discount = 0, paymentMethod }) {
  const paymentBase = getPaymentBaseAmount(subtotal, discount);
  const paymentAdjustment = calculatePaymentAdjustment(paymentMethod, paymentBase);
  const total = Math.max(0, roundMoney(paymentBase + paymentAdjustment.amount));
  return { paymentBase, paymentAdjustment, total };
}
