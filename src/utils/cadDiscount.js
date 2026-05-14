// src/utils/cadDiscount.js
// Volume discount logic for CAD/lines ploteo on Bond paper.

/**
 * Returns the discount percentage for a given total qualifying quantity.
 *   > 500 planos → 25 %
 *   > 250 planos → 20 %
 *   > 100 planos → 10 %
 *      else      →  0 %
 */
export function cadBulkDiscountPct(totalQty) {
  if (totalQty > 500) return 25;
  if (totalQty > 250) return 20;
  if (totalQty > 100) return 10;
  return 0;
}

/**
 * Returns the next discount tier the user can reach, or null if already at max.
 * { needed: number, pct: number }
 */
export function cadNextTier(totalQty) {
  if (totalQty <= 100) return { needed: 101 - totalQty, pct: 10 };
  if (totalQty <= 250) return { needed: 251 - totalQty, pct: 20 };
  if (totalQty <= 500) return { needed: 501 - totalQty, pct: 25 };
  return null; // already at max (25 %)
}

/**
 * Returns true when a cart item qualifies for the CAD volume discount:
 *   - Service is ploteo / planos
 *   - Substrate is Bond  (default when not set)
 *   - Saturation is "0-25"  (CAD / solo líneas, default when not set)
 */
export function isCadBondItem(it) {
  const rawKey = (
    it.serviceKey ||
    it.service?.key ||
    it.serviceName ||
    it.serviceLabel ||
    it.service?.name ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

  const isPloteo =
    rawKey === "ploteo" ||
    rawKey === "planos" ||
    rawKey.includes("ploteo") ||
    rawKey.includes("plotter") ||
    rawKey.includes("gran-formato");

  if (!isPloteo) return false;

  const opts = it.options || {};
  return (opts.plotSubstrate ?? "Bond") === "Bond" &&
         (opts.plotSaturation ?? "0-10") === "0-10";
}

/**
 * Calculates how many pages will actually be printed for an item,
 * respecting the selected print mode (all / page / range).
 */
function itemPageCount(it) {
  const totalPages = Math.max(1, parseInt(it.pageCount) || 1);
  const opts = it.options || {};
  const mode = opts.plotPrintMode ?? "all";
  if (mode === "page") return 1;
  if (mode === "range") {
    const f = Math.max(1, Math.min(totalPages, parseInt(opts.plotPrintFrom) || 1));
    const t = Math.max(f,   Math.min(totalPages, parseInt(opts.plotPrintTo)   || totalPages));
    return t - f + 1;
  }
  return totalPages; // "all"
}

/**
 * Sums total printed sheets (pages × copies) of all qualifying CAD-Bond items.
 * Example: 28-page plan × 6 copies = 168 sheets toward the volume discount.
 */
export function totalCadBondQty(items) {
  return (items || []).reduce((sum, it) => {
    if (!isCadBondItem(it)) return sum;
    const copies = Math.max(1, parseInt(it.options?.plotQuantity) || 1);
    const pages  = itemPageCount(it);
    return sum + copies * pages;
  }, 0);
}
