export const TRANSFER_DISCOUNT_RATE = 0.05;
export const TRANSFER_DISCOUNT_MIN_MXN = 50;

function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function getPaymentBaseAmount(subtotal, discount = 0) {
  const net = Math.max(0, roundMoney(subtotal) - roundMoney(discount));
  return roundMoney(net);
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

  if (method === "mercadopago" || method === "card") return emptyPaymentAdjustment("mercadopago");

  if (method === "transfer" || method === "transferencia") {
    if (base <= TRANSFER_DISCOUNT_MIN_MXN) return emptyPaymentAdjustment("transfer");
    const discount = roundMoney(base * TRANSFER_DISCOUNT_RATE);
    return {
      method: "transfer",
      type: "discount",
      label: "Descuento por transferencia",
      amount: -discount,
      rate: TRANSFER_DISCOUNT_RATE,
      minAmount: TRANSFER_DISCOUNT_MIN_MXN,
    };
  }

  return emptyPaymentAdjustment(method);
}

export function calculatePaymentTotal({ subtotal, discount = 0, paymentMethod }) {
  const paymentBase = getPaymentBaseAmount(subtotal, discount);
  const paymentAdjustment = calculatePaymentAdjustment(paymentMethod, paymentBase);
  const total = Math.max(0, roundMoney(paymentBase + paymentAdjustment.amount));
  return {
    paymentBase,
    paymentAdjustment,
    total,
  };
}
