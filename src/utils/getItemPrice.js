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
} from "../data/priceList";
import { calculatePlotPrice } from "./plotPrice";

// ── Impresión Offset — tabla de precios por millar (+50%) ───────────────────
const OFFSET_MAT = {
  "eco-115":    { "v1/4":{"4x1":315,"4x4":390},"v1/2":{"4x1":630,"4x4":780},"carta":{"4x1":1260,"4x4":1560},"oficio":{"4x1":1440,"4x4":1935},"tab":{"4x1":2520,"4x4":3120},"4c":{"4x1":5040,"4x4":6240},"8c":{"4x1":10080,"4x4":12480},"full":{"4x1":14775,"4x4":18015} },
  "gold-150":   { "v1/4":{"4x1":375,"4x4":450},"v1/2":{"4x1":750,"4x4":900},"carta":{"4x1":1500,"4x4":1800},"oficio":{"4x1":1875,"4x4":2325},"tab":{"4x1":3000,"4x4":3600},"4c":{"4x1":6000,"4x4":7200},"8c":{"4x1":12000,"4x4":14400},"full":{"4x1":15525,"4x4":18810} },
  "couche-300": { "mini-tarj":{"barnizado":240,"laminado":352.5,"barniz-reg":615},"tarjeta":{"barnizado":270,"laminado":420,"barniz-reg":720},"mini-postal":{"barnizado":450,"laminado":720,"barniz-reg":1275},"separador":{"barnizado":450,"laminado":720,"barniz-reg":1275},"postal-chica":{"barnizado":630,"laminado":1035,"barniz-reg":1875},"postal-grande":{"barnizado":810,"laminado":1350,"barniz-reg":2475},"postal-1/4":{"barnizado":990,"laminado":1665,"barniz-reg":3225},"postal-1/2":{"barnizado":1650,"laminado":2730,"barniz-reg":5400},"postal-carta":{"barnizado":3300,"laminado":5460,"barniz-reg":10800},"oficio":{"barnizado":3750,"laminado":6390,"barniz-reg":12675},"tabloide":{"barnizado":6600,"laminado":10920,"barniz-reg":21600},"4-cartas":{"barnizado":11250,"laminado":20250,"barniz-reg":39450} },
  "bond-75":    { "v1/4":{"4x0":330},"v1/2":{"4x0":660},"carta":{"4x0":1320},"oficio":{"4x0":1425},"tab":{"4x0":2490},"4c":{"4x0":4980},"8c":{"4x0":9960} },
  "adhesivo-90":{ "carta":{"4x0":3825},"tab":{"4x0":6150},"4c":{"4x0":12300} },
  "folder":     { "carta-barn":11700,"carta-lam":18750,"carta-reg":22500,"oficio-barn":14250,"oficio-lam":22950,"oficio-reg":27750 },
};
const OFFSET_ACABADOS = { diptico:150,triptico:150,cuadriptico:375,foliado:150,engomado:75,perforado:150 };

function calcOffsetPrice(opts) {
  const matKey = opts.offMaterial;
  const fmtKey = opts.offFormat;
  const matData = OFFSET_MAT[matKey];
  if (!matData || !fmtKey) return null;
  const millares = Math.max(1, Number(opts.offMillares || 1));

  let basePerMillar = null;
  if (matKey === "folder") {
    basePerMillar = typeof matData[fmtKey] === "number" ? matData[fmtKey] : null;
  } else if (matKey === "couche-300") {
    const finish = opts.offFinish || "barnizado";
    basePerMillar = matData[fmtKey]?.[finish] ?? null;
  } else {
    const mode = opts.offColorMode;
    basePerMillar = matData[fmtKey]?.[mode] ?? null;
  }
  if (basePerMillar === null) return null;

  const acabados = Array.isArray(opts.offAcabados) ? opts.offAcabados : [];
  const extra = acabados.reduce((s, k) => s + (OFFSET_ACABADOS[k] || 0), 0);
  const totalPerMillar = basePerMillar + extra;
  const total = totalPerMillar * millares;
  return { total, perUnit: totalPerMillar, qty: millares, label: `${millares} millar${millares !== 1 ? "es" : ""}` };
}

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

function parsePageSpec(spec, maxPage) {
  const set = new Set();
  if (!spec || !maxPage) return set;

  for (const token of String(spec).split(",").map((t) => t.trim()).filter(Boolean)) {
    if (/^\d+$/.test(token)) {
      const n = Number(token);
      if (n >= 1 && n <= maxPage) set.add(n);
      continue;
    }

    if (/^\d+-\d+$/.test(token)) {
      const [a, b] = token.split("-").map(Number);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i += 1) {
        if (i >= 1 && i <= maxPage) set.add(i);
      }
    }
  }

  return set;
}

function selectedPlotPages(opts, totalPages) {
  const pages = new Set();
  const mode = opts.plotPrintMode ?? "all";

  if (mode === "page") {
    pages.add(Math.max(1, Math.min(totalPages, parseInt(opts.plotPrintPage) || 1)));
    return pages;
  }

  if (mode === "range") {
    const from = Math.max(1, Math.min(totalPages, parseInt(opts.plotPrintFrom) || 1));
    const to = Math.max(from, Math.min(totalPages, parseInt(opts.plotPrintTo) || totalPages));
    for (let i = from; i <= to; i += 1) pages.add(i);
    return pages;
  }

  for (let i = 1; i <= totalPages; i += 1) pages.add(i);
  return pages;
}

function finiteOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// ── Constantes de ploteo (mismas que usePriceCalculator) ────────────────────
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

  // Trámites documentales con precio fijo
  if (
    key === "acta-nacimiento" ||
    key === "acta-matrimonio" ||
    key === "acta-defuncion"
  ) {
    return { total: 85, perUnit: 85, qty: 1, label: "1 acta" };
  }

  if (key === "constancia-situacion-fiscal") {
    return { total: 120, perUnit: 120, qty: 1, label: "1 constancia" };
  }

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
    const qty      = Math.max(1, Number(opts.bindQty ?? 1));
    const table    = ENGARGOLADO[bindType] ?? ENGARGOLADO.metalico;
    const price    = lookupPrice(table, pages);
    if (price === null) return null;
    return {
      total: price * qty,
      perUnit: price,
      qty,
      label: `${qty} engargolado${qty !== 1 ? "s" : ""} de ${pages} pág.`,
    };
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
    const width = opts.plotWidth ?? item.pageWidthCm ?? 0;
    const height = opts.plotHeight ?? item.pageHeightCm ?? 0;
    const unit = opts.plotUnit || "cm";
    const substrate = opts.plotSubstrate || "Bond";
    const mode = opts.plotMode || "color";
    const saturation = opts.plotSaturation || "0-10";
    const qty = Math.max(1, Number(opts.plotQuantity ?? 1));
    const widthCm = unit === "m" ? Number(width) * 100 : Number(width);
    const hasWidthLimit = ["Bond", "Opalina", "Fotográfico", "Fotografico", "Canvas"].includes(substrate);

    if (hasWidthLimit && Number.isFinite(widthCm) && widthCm > 91) return null;

    const totalPages = Math.max(1, parseInt(item.pageCount ?? 1) || 1);
    const selectedPages = selectedPlotPages(opts, totalPages);
    const exceptEnabled = Boolean(opts.plotExceptEnabled);
    const exceptPages = exceptEnabled
      ? [...parsePageSpec(opts.plotExceptSpec, totalPages)].filter((page) => selectedPages.has(page))
      : [];
    const exceptPagesCount = exceptPages.length;
    const mainPagesCount = Math.max(0, selectedPages.size - exceptPagesCount);
    const coveragePct = opts.plotCadOverride ? null : finiteOrNull(opts.plotCoveragePct ?? opts.coveragePct);

    const mainCalc = calculatePlotPrice({
      width,
      height,
      unit,
      substrate,
      mode,
      saturation,
      quantity: 1,
      coveragePct,
    });
    if (!mainCalc.valid || mainPagesCount <= 0) return null;

    const exceptSubstrate = opts.plotExceptSubstrate || "Fotográfico";
    const exceptCalc = exceptPagesCount > 0
      ? calculatePlotPrice({
          width,
          height,
          unit,
          substrate: exceptSubstrate,
          mode,
          saturation: "0-10",
          quantity: 1,
          coveragePct: null,
        })
      : null;
    if (exceptPagesCount > 0 && !exceptCalc?.valid) return null;

    const mainTotal = mainCalc.subtotal * mainPagesCount * qty;
    const exceptTotal = exceptCalc?.valid ? exceptCalc.subtotal * exceptPagesCount * qty : 0;
    const total = parseFloat((mainTotal + exceptTotal).toFixed(2));
    const pagesLabel = selectedPages.size > 1 ? `${selectedPages.size} pags` : "1 pag";

    return {
      total,
      perUnit: parseFloat((total / qty).toFixed(2)),
      qty,
      label: `${qty} copia${qty !== 1 ? "s" : ""} x ${pagesLabel}`,
    };
  }

  // ── Stickers ─────────────────────────────────────────────────────────────
  if (key === "stickers") {
    const w = parseFloat(opts.stkWidthCm  ?? 0);
    const h = parseFloat(opts.stkHeightCm ?? 0);
    if (!w || !h || w <= 0 || h <= 0) return null;

    // Cantidad efectiva
    let qty = 0;
    if (opts.stkQtyPreset && opts.stkQtyPreset !== "custom") {
      qty = Number(opts.stkQtyPreset);
    } else {
      qty = Number(opts.stkQtyCustom ?? 0);
    }
    if (!qty || qty <= 0) return null;

    const material    = opts.stkMaterial   || "vinil-mate";
    const cutType     = opts.stkCutType    || "hoja";
    const laminado    = !!opts.stkLaminado;
    const laminadoTipo = laminado ? (opts.stkLaminadoTipo || "brillante") : null;

    // Constantes (mismas que StickersOptionsEditor)
    const PRECIO_MAT  = { "vinil-mate": 200, "vinil-brillante": 250, "vinil-transparente": 400 };
    const PLOTTER_W   = 50;
    const ROLLO_W     = 150;
    const USABLE_H    = 140;
    const GRIP        = 10;
    const TIRA_TOTAL  = USABLE_H + GRIP;       // 150 cm
    const TIRAS_ROLLO = Math.floor(ROLLO_W / PLOTTER_W); // 3
    const MIN_CM      = 60;
    const MARGEN      = 0.2;
    const HOJA_UW     = 18; const HOJA_UH = 33; const HOJA_PRECIO = 28;
    const LAM_M       = { brillante: 60, mate: 107 };

    const wE = w + MARGEN * 2;
    const hE = h + MARGEN * 2;

    // ── Precio en hoja ──────────────────────────────────────────────────────
    const xH = Math.floor(HOJA_UW / wE);
    const yH = Math.floor(HOJA_UH / hE);
    let totalHoja = null;
    if (xH > 0 && yH > 0) {
      const hojas = Math.ceil(qty / (xH * yH));
      const corte = qty * (cutType === "individual" ? 0.50 : 0.40);
      totalHoja = hojas * HOJA_PRECIO + corte;
    }

    // ── Precio en tira ──────────────────────────────────────────────────────
    const xT = Math.floor(PLOTTER_W / wE);
    const yT = Math.floor(USABLE_H  / hE);
    let totalTira = null;
    if (xT > 0 && yT > 0) {
      const porTira   = xT * yT;
      const tirasCorte = Math.ceil(qty / porTira);
      const filas     = Math.ceil(qty / (xT * TIRAS_ROLLO));
      const largo     = Math.max(filas * hE + GRIP, MIN_CM);
      const pVinil    = (largo / 100) * (PRECIO_MAT[material] ?? 200);
      const pCorte    = qty * (cutType === "individual" ? 0.50 : 0.40);
      const pLam      = laminadoTipo
        ? tirasCorte * (TIRA_TOTAL / 100) * (LAM_M[laminadoTipo] ?? 0)
        : 0;
      totalTira = pVinil + pCorte + pLam;
    }

    // Auto-selecciona el más barato (hoja solo si no hay laminado)
    let total;
    if (!laminado && totalHoja !== null && (totalTira === null || totalHoja <= totalTira)) {
      total = totalHoja;
    } else if (totalTira !== null) {
      total = totalTira;
    } else {
      return null;
    }

    return {
      total:   parseFloat(total.toFixed(2)),
      perUnit: parseFloat((total / qty).toFixed(2)),
      qty,
      label: `${qty} sticker${qty !== 1 ? "s" : ""}`,
    };
  }

  // ── Impresión Offset (artes) ─────────────────────────────────────────────
  if (key === "artes") {
    return calcOffsetPrice(opts);
  }

  // Cualquier otro servicio → cotizar en sucursal
  return null;
}

export function fmtMXN(n) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
