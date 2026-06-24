import { getItemPrice } from "./getItemPrice.js";
import { calculatePaymentTotal } from "./paymentAdjustments.js";

export function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export function extractCouponCode(order) {
  const direct = order?.coupon_code || order?.pricing_summary?.couponCode;
  if (direct) return String(direct).trim().toUpperCase();

  const match = String(order?.notes || "").match(/cupon:\s*([A-Z0-9_-]+)/i);
  return match?.[1] ? match[1].trim().toUpperCase() : null;
}

async function resolveCoupon(client, couponCode, subtotal) {
  if (!couponCode || subtotal <= 0) return null;

  const { data, error } = await client
    .from("cupones")
    .select("*")
    .eq("code", couponCode)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  if (data.max_uses !== null && Number(data.uses || 0) >= Number(data.max_uses)) return null;
  if (data.min_order !== null && subtotal < Number(data.min_order)) return null;

  const value = Number(data.value);
  if (!Number.isFinite(value) || value <= 0) return null;

  const discount = data.type === "percent"
    ? roundMoney(subtotal * (value / 100))
    : roundMoney(Math.min(value, subtotal));

  return {
    code: data.code,
    type: data.type,
    value,
    discount: discount ?? 0,
  };
}

export async function calculateOrderPricing(client, order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const pricedItems = items.map((item, index) => {
    const pricing = getItemPrice(item);
    return pricing
      ? {
          index,
          total: roundMoney(pricing.total) ?? 0,
          perUnit: roundMoney(pricing.perUnit),
          qty: Number(pricing.qty ?? 1) || 1,
          label: pricing.label || "",
        }
      : null;
  });

  const unknownItems = pricedItems
    .map((pricing, index) => (pricing ? null : index))
    .filter((index) => index !== null);
  const subtotal = roundMoney(
    pricedItems.reduce((sum, pricing) => sum + (pricing?.total || 0), 0)
  ) ?? 0;
  const couponCode = extractCouponCode(order);
  const coupon = await resolveCoupon(client, couponCode, subtotal);
  const discount = coupon?.discount || 0;
  const paymentMethod = String(order?.payment_method || "").toLowerCase();
  const paymentTotal = calculatePaymentTotal({
    subtotal,
    discount,
    paymentMethod,
  });

  return {
    currency: "MXN",
    subtotal,
    discount,
    displaySubtotal: roundMoney(paymentTotal.paymentBase + discount) ?? paymentTotal.paymentBase,
    paymentBase: paymentTotal.paymentBase,
    paymentAdjustment: paymentTotal.paymentAdjustment,
    total: paymentTotal.total,
    couponCode: coupon?.code || couponCode || null,
    coupon,
    items: pricedItems,
    hasUnknownTotal: unknownItems.length > 0,
    unknownItems,
  };
}
