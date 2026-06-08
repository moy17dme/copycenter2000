const BOND_PRICES = {
  "0-10": { bn: 36, color: 60 },
  "11-25": { bn: 45, color: 85 },
  "26-40": { bn: 50, color: 120 },
  "41-60": { bn: 80, color: 150 },
  "61-80": { bn: 100, color: 180 },
  "81-100": { bn: 150, color: 220 },
};

const RANGE_ORDER = ["0-10", "11-25", "26-40", "41-60", "61-80", "81-100"];
const RANGE_BOUNDS = {
  "0-10": [0, 12],
  "11-25": [13, 25],
  "26-40": [26, 40],
  "41-60": [41, 60],
  "61-80": [61, 80],
  "81-100": [81, 100],
};

const SPECIALTY_ML = {
  Opalina: 300,
  "Fotografico": 420,
  "Fotográfico": 420,
  Canvas: 750,
  Vinil: 250,
};

const LONA_M2 = 85;

function interpolateBondPrice(saturation, coveragePct, mode) {
  const rangeIdx = RANGE_ORDER.indexOf(saturation);
  if (rangeIdx <= 0) return BOND_PRICES[saturation]?.[mode] ?? BOND_PRICES["0-10"][mode];

  const [low, high] = RANGE_BOUNDS[saturation];
  const topPrice = BOND_PRICES[saturation][mode];
  const prevRange = RANGE_ORDER[rangeIdx - 1];
  const basePrice = BOND_PRICES[prevRange][mode];
  const clamped = Math.max(low, Math.min(high, coveragePct));
  const t = high === low ? 1 : (clamped - low) / (high - low);

  return Math.round(basePrice + t * (topPrice - basePrice));
}

export function calculatePlotPrice({
  width,
  height,
  unit = "cm",
  substrate = "Bond",
  mode = "color",
  saturation = "0-10",
  quantity = 1,
  coveragePct = null,
}) {
  const w = parseFloat(width);
  const h = parseFloat(height);
  const qty = Math.max(1, parseInt(quantity) || 1);

  if (!w || !h || w <= 0 || h <= 0) return { valid: false };

  const factor = unit === "cm" ? 0.01 : 1;
  const wM = w * factor;
  const hM = h * factor;

  let unitPrice = 0;
  let dimension = 0;
  let isPerM2 = false;
  let interpolated = false;
  let rangePrice = null;

  if (substrate === "Lona") {
    dimension = wM * hM;
    isPerM2 = true;
    unitPrice = LONA_M2;
  } else if (substrate === "Bond") {
    dimension = hM;
    const prices = BOND_PRICES[saturation] ?? BOND_PRICES["0-10"];
    rangePrice = mode === "bn" ? prices.bn : prices.color;

    const rangeIdx = RANGE_ORDER.indexOf(saturation);
    if (coveragePct != null && rangeIdx > 0) {
      unitPrice = interpolateBondPrice(saturation, coveragePct, mode);
      interpolated = true;
    } else {
      unitPrice = rangePrice;
    }
  } else {
    dimension = hM;
    unitPrice = SPECIALTY_ML[substrate] ?? 0;
  }

  if (!unitPrice || !dimension) return { valid: false };

  const subtotal = unitPrice * dimension;
  const total = subtotal * qty;

  return {
    valid: true,
    unitPrice,
    dimension: parseFloat(dimension.toFixed(4)),
    isPerM2,
    subtotal: parseFloat(subtotal.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    qty,
    interpolated,
    rangePrice,
  };
}
