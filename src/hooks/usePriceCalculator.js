import { useMemo } from 'react';

const BOND_PRICES = {
  '0-10':   { bn: 36,  color: 60  },
  '11-25':  { bn: 45,  color: 85  },
  '26-40':  { bn: 50,  color: 120 },
  '41-60':  { bn: 80,  color: 150 },
  '61-80':  { bn: 100, color: 180 },
  '81-100': { bn: 150, color: 220 },
};

// Ordered list of ranges (low → high)
const RANGE_ORDER = ['0-10', '11-25', '26-40', '41-60', '61-80', '81-100'];

// Numeric [low, high] bounds for each range.
// The "0-10" tier covers up to 12 % real coverage for non-CAD files, and up
// to 35 % for cadLike files (extended ceiling, see useInkCoverage.js).
// The "11-25" interpolation therefore starts at 13 % (just above the base CAD ceiling).
const RANGE_BOUNDS = {
  '0-10':   [0,  12],   // base ceiling; cadLike files extend to 35 % via coverageToRange
  '11-25':  [13, 25],
  '26-40':  [26, 40],
  '41-60':  [41, 60],
  '61-80':  [61, 80],
  '81-100': [81, 100],
};

const SPECIALTY_ML = {
  Opalina:     300,
  Fotográfico: 420,
  Canvas:      750,
  Vinil:       250,
};

const LONA_M2 = 85;

/**
 * Linearly interpolates the Bond price within a saturation range.
 *
 * Logic:
 *   - The top of the range uses the table price (full range price).
 *   - The bottom of the range blends toward the previous range's price.
 *   - Range "0-10" (CAD/lines) is never interpolated — always flat price.
 *
 * Example: range "11-25", mode color → table prices: prev=$60, top=$85.
 *   At 11% → ~$60, at 17% → ~$73, at 25% → $85.
 */
function interpolateBondPrice(saturation, coveragePct, mode) {
  const rangeIdx = RANGE_ORDER.indexOf(saturation);

  // First range or unknown → flat price, no interpolation
  if (rangeIdx <= 0) return BOND_PRICES[saturation]?.[mode] ?? BOND_PRICES['0-10'][mode];

  const [low, high] = RANGE_BOUNDS[saturation];
  const topPrice    = BOND_PRICES[saturation][mode];
  const prevRange   = RANGE_ORDER[rangeIdx - 1];
  const basePrice   = BOND_PRICES[prevRange][mode];

  // Clamp coverage to the range, then interpolate
  const clamped = Math.max(low, Math.min(high, coveragePct));
  const t       = high === low ? 1 : (clamped - low) / (high - low);

  return Math.round(basePrice + t * (topPrice - basePrice));
}

/**
 * Pure calculation hook for ploteo pricing.
 *
 * @param {object}        params
 * @param {string|number} params.width       - Ancho (in `unit`)
 * @param {string|number} params.height      - Largo/alto (in `unit`)
 * @param {'cm'|'m'}      params.unit        - Unit of measurement
 * @param {string}        params.substrate   - Bond | Opalina | Fotográfico | Canvas | Lona | Vinil
 * @param {'bn'|'color'}  params.mode        - B/N or Color (affects Bond pricing only)
 * @param {string}        params.saturation  - '0-10' | '11-25' | '26-40' | '41-60' | '61-80' | '81-100'
 * @param {number}        params.quantity    - Number of copies
 * @param {number|null}   params.coveragePct - Exact detected ink coverage % (enables fine-grained pricing for Bond)
 */
export function usePriceCalculator({
  width,
  height,
  unit = 'cm',
  substrate = 'Bond',
  mode = 'color',
  saturation = '0-10',
  quantity = 1,
  coveragePct = null,
}) {
  return useMemo(() => {
    const w   = parseFloat(width);
    const h   = parseFloat(height);
    const qty = Math.max(1, parseInt(quantity) || 1);

    if (!w || !h || w <= 0 || h <= 0) return { valid: false };

    const factor = unit === 'cm' ? 0.01 : 1;
    const wM = w * factor;
    const hM = h * factor;

    let unitPrice    = 0;
    let dimension    = 0;
    let isPerM2      = false;
    let interpolated = false; // true when price was fine-tuned by exact coveragePct
    let rangePrice   = null;  // the flat table price for the full range (for display)

    if (substrate === 'Lona') {
      dimension = wM * hM;
      isPerM2   = true;
      unitPrice = LONA_M2;
    } else if (substrate === 'Bond') {
      dimension = hM; // metro lineal basado en el largo
      const prices = BOND_PRICES[saturation] ?? BOND_PRICES['0-10'];
      rangePrice   = mode === 'bn' ? prices.bn : prices.color;

      // Use fine-grained interpolation when we have the exact coverage %
      // and the range is above "0-10" (CAD flat price stays flat)
      const rangeIdx = RANGE_ORDER.indexOf(saturation);
      if (coveragePct != null && rangeIdx > 0) {
        unitPrice    = interpolateBondPrice(saturation, coveragePct, mode);
        interpolated = true;
      } else {
        unitPrice = rangePrice;
      }
    } else {
      dimension = hM; // metro lineal basado en el largo
      unitPrice = SPECIALTY_ML[substrate] ?? 0;
    }

    const subtotal = unitPrice * dimension;
    const total    = subtotal * qty;

    return {
      valid:       true,
      unitPrice,
      dimension:   parseFloat(dimension.toFixed(4)),
      isPerM2,
      subtotal:    parseFloat(subtotal.toFixed(2)),
      total:       parseFloat(total.toFixed(2)),
      qty,
      // Extra metadata for Bond fine-pricing display
      interpolated,
      rangePrice,
    };
  }, [width, height, unit, substrate, mode, saturation, quantity, coveragePct]);
}
