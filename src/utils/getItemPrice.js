// src/utils/getItemPrice.js
// Calcula el precio estimado de un ítem del carrito.
// Devuelve { total, perUnit, qty, label } o null si no se puede calcular.

import {
  SUBLIMACION,
  FOTOBOTONES,
  CREDENCIALES_PVC,
  ESCANEOS,
  COPIAS,
  ENGARGOLADO,
  lookupPrice,
  getPrintPrice,
  normalizeColorMode,
} from "../data/priceList";

// ── Helpers de impresión (equivalentes a PrintOptionsEditor) ────────────────
const SIZE_TO_FORMAT = {
  "1/4 Carta": "Carta", "1/2 Carta": "Carta",
  Carta: "Carta", Oficio: "Oficio",
  "Doble Carta": "Doble Carta", "11x17": "Doble Carta",
  "12x18": "Doble Carta", "13x19": "13x19",
};
const INKJET_PAPERS = new Set(["Bond 75 g","Bond 90 g","Opalina 115 g","Opalina 225 g"]);

function getColorKey(colorMode, paper, tech) {
  if (colorMode === "bn") return "negro";
  if (INKJET_PAPERS.has(paper) && tech === "inkjet") return "colorInkjet";
  return "colorLaser";
}

function countPagesInRange(spec, total) {
  const pages = new Set();
  for (const part of String(spec || "").split(",")) {
    const t = part.trim();
    if (t.includes("-")) {
      const [a, b] = t.split("-").map(s => parseInt(s.trim()) || 1);
      for (let i = Math.max(1, a); i <= Math.min(total, b); i++) pages.add(i);
    } else {
      const n = parseInt(t);
      if (n >= 1 && n <= total) pages.add(n);
    }
  }
  return pages.size;
}

function effectivePagesCount(pageMode, pageRange, pageCount) {
  const total = Math.max(1, pageCount || 1);
  if (pageMode === "actual") return 1;
  if (pageMode === "rango") return Math.max(1, countPagesInRange(pageRange, total));
  return total;
}

// ── Constantes de ploteo (mismas que usePriceCalculator) ────────────────────
const PLOTEO_BOND_PRICES = {
  "0-10":   { bn: 36,  color: 60  },
  "11-25":  { bn: 45,  color: 85  },
  "26-40":  { bn: 50,  color: 120 },
  "41-60":  { bn: 80,  color: 150 },
  "61-80":  { bn: 100, color: 180 },
  "81-100": { bn: 150, color: 220 },
};
const PLOTEO_SPECIALTY_ML = {
  Opalina: 300, Fotográfico: 420, Canvas: 750, Vinil: 250,
};
const PLOTEO_LONA_M2 = 85;

// ── normalizeKey ────────────────────────────────────────────────────────────
function normalizeKey(item) {
  return (
    item?.serviceKey ||
    item?.serviceLabel ||
    item?.serviceName  ||
    item?.service?.key ||
    item?.service?.name ||
    ""
  )
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

// ── getItemPrice ─────────────────────────────────────────────────────────────
export function getItemPrice(item) {
  if (!item) return null;
  const opts = item.options || {};
  const key  = normalizeKey(item);

  // ── Fotobotones / pines ──────────────────────────────────────────────────
  if (key.includes("fotobot") || key === "pin" || key === "pines" ||
      (key.includes("pin") && !key.includes("imprimir") && !key.includes("impresion"))) {
    const type   = opts.pinType || "pin";
    const qty    = Math.max(1, Number(opts.gamesQty ?? 1));
    const table  = FOTOBOTONES[type] ?? FOTOBOTONES.pin;
    const perUnit = lookupPrice(table, qty);
    if (perUnit === null) return null;
    return { total: perUnit * qty, perUnit, qty, label: `${qty} pza${qty !== 1 ? "s" : ""}` };
  }

  // ── Sublimación ──────────────────────────────────────────────────────────
  if (key === "sublimacion") {
    const product = opts.subProductType || "";
    const qty     = Math.max(1, Number(opts.gamesQty ?? opts.subQty ?? 1));

    if (product === "playera") {
      const nino = Math.max(0, Number(opts.subSizeNino ?? 0));
      const ch   = Math.max(0, Number(opts.subSizeCH   ?? 0));
      const m    = Math.max(0, Number(opts.subSizeM    ?? 0));
      const g    = Math.max(0, Number(opts.subSizeG    ?? 0));
      const xl   = Math.max(0, Number(opts.subSizeXL   ?? 0));
      const total_qty = nino + ch + m + g + xl || qty;
      const vol_qty   = total_qty; // precio por volumen basado en cantidad total

      const sizes = [
        { n: nino, table: SUBLIMACION.playeraNino    },
        { n: ch,   table: SUBLIMACION.playeraChica   },
        { n: m,    table: SUBLIMACION.playeraMediana },
        { n: g,    table: SUBLIMACION.playeraGrande  },
        { n: xl,   table: SUBLIMACION.playeraGrande  }, // XL = misma tabla que G
      ];

      let total = 0;
      for (const { n, table } of sizes) {
        if (n <= 0) continue;
        const p = lookupPrice(table, vol_qty);
        if (p === null) return null;
        total += p * n;
      }
      if (total === 0) {
        // sin desglose de tallas, usar playeraChica como referencia
        const p = lookupPrice(SUBLIMACION.playeraChica, qty);
        if (p === null) return null;
        return { total: p * qty, perUnit: p, qty, label: `${qty} playera${qty !== 1 ? "s" : ""}` };
      }
      return { total, perUnit: total / total_qty, qty: total_qty, label: `${total_qty} playera${total_qty !== 1 ? "s" : ""}` };
    }

    const MAP = {
      "taza-blanca":    SUBLIMACION.taza,
      "taza-magica":    SUBLIMACION.tazaMagica,
      "termo-metalico": SUBLIMACION.termo,
    };
    const table = MAP[product];
    if (!table) return null; // cojín, mousepad, rompecabezas → cotizar
    const perUnit = lookupPrice(table, qty);
    if (perUnit === null) return null;
    return { total: perUnit * qty, perUnit, qty, label: `${qty} pza${qty !== 1 ? "s" : ""}` };
  }

  // ── Credenciales PVC ─────────────────────────────────────────────────────
  if (key === "pvc") {
    const sides   = opts.pvcSides   || "frente";
    const variant = opts.pvcVariant || "normal";
    const qty     = Math.max(1, Number(opts.gamesQty ?? 1));
    const sideKey = sides === "ambos" ? "ambosLados" : "unLado";
    const table   = CREDENCIALES_PVC[sideKey]?.[variant];
    if (!table) return null;
    const perUnit = lookupPrice(table, qty);
    if (perUnit === null) return null;
    return { total: perUnit * qty, perUnit, qty, label: `${qty} tarjeta${qty !== 1 ? "s" : ""}` };
  }

  // ── Escaneos ─────────────────────────────────────────────────────────────
  if (key.includes("escaneo") || key.includes("digitaliz")) {
    const size = opts.scanSize || "Carta";
    const qty  = Math.max(1, Number(opts.scanQtyApprox ?? 1));
    const SIZE_MAP = {
      "Carta":             ESCANEOS.cartaOficio,
      "Oficio":            ESCANEOS.cartaOficio,
      "Doble Carta":       ESCANEOS.doble,
      "Plano A3/A2/A1/A0": ESCANEOS.plano,
    };
    const table   = SIZE_MAP[size] ?? ESCANEOS.cartaOficio;
    const perUnit = lookupPrice(table, qty);
    if (perUnit === null) return null;
    return { total: perUnit * qty, perUnit, qty, label: `${qty} hoja${qty !== 1 ? "s" : ""}` };
  }

  // ── Copias (fotocopiadora) ───────────────────────────────────────────────
  if (key.includes("copia")) {
    const size     = opts.copySize      || "Carta";
    const mode     = opts.copyColorMode || "bn";
    const tech     = opts.copyColorTech || "laser";
    const qty      = Math.max(1, Number(opts.copyQtyApprox ?? 1));
    const colorKey = mode === "bn" ? "negro" : tech === "inkjet" ? "colorInkjet" : "colorLaser";
    const modeTable = COPIAS[colorKey] ?? COPIAS.negro;
    const perUnit   = lookupPrice(modeTable, qty, size);
    if (perUnit === null) return null;
    let total = perUnit * qty;
    // Engargolado adicional (se aplica sobre el número de páginas del documento)
    const pages = Math.max(1, Number(item.pageCount ?? qty));
    if (opts.copyFinish === "engargolado-metalico" || opts.copyFinish === "engargolado-plastico") {
      const bindType  = opts.copyFinish === "engargolado-metalico" ? "metalico" : "plastico";
      const bindPrice = lookupPrice(ENGARGOLADO[bindType], pages);
      if (bindPrice !== null) total += bindPrice;
    }
    return { total, perUnit, qty, label: `${qty} copia${qty !== 1 ? "s" : ""}` };
  }

  // ── Engargolado solo ─────────────────────────────────────────────────────
  if (key.includes("engargol")) {
    const bindType = opts.bindType || "metalico";
    const pages    = Math.max(1, Number(item.pageCount ?? opts.bindPages ?? 1));
    const table    = ENGARGOLADO[bindType] ?? ENGARGOLADO.metalico;
    const price    = lookupPrice(table, pages);
    if (price === null) return null;
    return { total: price, perUnit: price, qty: 1, label: `${pages} pág.` };
  }

  // ── Impresión digital ────────────────────────────────────────────────────
  if (key === "impresion") {
    const paper     = opts.paper      || "Bond 75 g";
    const colorMode = opts.colorMode  || "color";
    const tech      = opts.printTech  || "laser";
    const size      = opts.size       || "Carta";
    const sets      = Math.max(1, Number(opts.printSets ?? 1));
    const nUp       = Math.max(1, Number(opts.nUp       ?? 1));
    const isDuplex  = opts.duplex && opts.duplex !== "simple";
    const pageMode  = opts.pageMode   || "todas";
    const pageRange = opts.pageRange  || "";

    const pages         = effectivePagesCount(pageMode, pageRange, item.pageCount);
    const sheetsPerSet  = isDuplex ? Math.ceil(pages / (nUp * 2)) : Math.ceil(pages / nUp);
    const totalSheets   = sheetsPerSet * sets;

    const colorKey  = getColorKey(colorMode, paper, tech);
    const pricingSize = SIZE_TO_FORMAT[size] || "Carta";
    const perSheet  = getPrintPrice(paper, totalSheets, pricingSize, colorKey);
    if (perSheet === null) return null;

    const label = sets > 1
      ? `${pages} pág × ${sets} juegos = ${totalSheets} hojas`
      : `${totalSheets} hoja${totalSheets !== 1 ? "s" : ""}`;

    return { total: perSheet * totalSheets, perUnit: perSheet, qty: totalSheets, label };
  }

  // ── Ploteo ───────────────────────────────────────────────────────────────
  if (key === "ploteo") {
    const w         = parseFloat(opts.plotWidth    ?? 0);
    const h         = parseFloat(opts.plotHeight   ?? 0);
    if (!w || !h || w <= 0 || h <= 0) return null;

    const unit      = opts.plotUnit      || "cm";
    const substrate = opts.plotSubstrate || "Bond";
    const mode      = opts.plotMode      || "color";
    const saturation= opts.plotSaturation|| "0-10";
    const qty       = Math.max(1, Number(opts.plotQuantity ?? 1));

    const factor = unit === "cm" ? 0.01 : 1;
    const wM = w * factor;
    const hM = h * factor;

    let unitPrice, dimension;
    if (substrate === "Lona") {
      dimension = wM * hM;
      unitPrice = PLOTEO_LONA_M2;
    } else if (substrate === "Bond") {
      dimension = hM;
      const prices = PLOTEO_BOND_PRICES[saturation] ?? PLOTEO_BOND_PRICES["0-10"];
      unitPrice = mode === "bn" ? prices.bn : prices.color;
    } else {
      dimension = hM;
      unitPrice = PLOTEO_SPECIALTY_ML[substrate] ?? null;
    }

    if (!unitPrice || !dimension) return null;
    const total = parseFloat((unitPrice * dimension * qty).toFixed(2));
    return {
      total,
      perUnit: parseFloat((unitPrice * dimension).toFixed(2)),
      qty,
      label: `${qty} plano${qty !== 1 ? "s" : ""}`,
    };
  }

  // Artes, stickers, y cualquier otro servicio → cotizar en sucursal
  return null;
}

export function fmtMXN(n) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
