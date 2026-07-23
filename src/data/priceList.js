/**
 * Lista de precios 2026 — CopyCenter 2000
 * Fuente: listadepreciospagina2026_modificada23_06_2026.xlsx
 *
 * Estructura de cada tabla: Array de rangos.
 * Cada rango: { min, max, [formato|tipo]: precio, ... }
 * Para tablas de un solo producto: { min, max, price }
 *
 * Uso: import { lookupPrice, PRICES } from '@/data/priceList';
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const ONLINE_PAYMENT_FEE_RATE = 0.035;
export const ONLINE_PAYMENT_FIXED_FEE_MXN = 4;
export const IVA_RATE = 0.16;

function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function priceWithOnlineCost(value) {
  const base = roundMoney(value);
  if (base <= 0) return 0;
  const feeWithIva = (base * ONLINE_PAYMENT_FEE_RATE + ONLINE_PAYMENT_FIXED_FEE_MXN) * (1 + IVA_RATE);
  return roundMoney(base + feeWithIva);
}

export function fmtOnlinePrice(value) {
  return priceWithOnlineCost(value).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function withOnlinePriceText(text) {
  return String(text || "").replace(/\$([\d,]+(?:\.\d+)?)/g, (_, raw) => {
    const value = Number(String(raw).replace(/,/g, ""));
    if (!Number.isFinite(value)) return `$${raw}`;
    return `$${fmtOnlinePrice(value)}`;
  });
}

/**
 * Devuelve el precio correspondiente al rango de cantidad dado.
 * @param {Array<{min:number, max:number, [key:string]: number}>} table
 * @param {number} qty
 * @param {string} [key] - Nombre del campo de precio (ej. "Carta", "price")
 * @returns {number|null}
 */
export function lookupPrice(table, qty, key = "price") {
  const row = table.find((r) => qty >= r.min && qty <= r.max);
  return row ? (row[key] ?? null) : null;
}

/**
 * Parsea un string de rango "min-max" o "min+" en { min, max }.
 * Internamente usado para construir las tablas.
 */
function r(min, max, fields) {
  return { min, max: max === Infinity ? 9_999_999 : max, ...fields };
}

// ---------------------------------------------------------------------------
// PAPEL BOND — Impresión digital
// ---------------------------------------------------------------------------

export const BOND = {
  /** Impresión en negro (inyección o laser B/N) */
  negro: [
    r(1,    99,   { Carta: 1.00, Oficio: 1.50, "Doble Carta": 6.00 }),
    r(100,  499,  { Carta: 0.70, Oficio: 1.00, "Doble Carta": 6.00 }),
    r(500,  999,  { Carta: 0.70, Oficio: 0.90, "Doble Carta": 5.50 }),
    r(1000, 4999, { Carta: 0.70, Oficio: 0.90, "Doble Carta": 5.00 }),
    r(10000, 49999, { Carta: 0.60, Oficio: 0.90, "Doble Carta": 4.50 }),
  ],
  /** Color láser */
  colorLaser: [
    r(1,    49,   { Carta:  8.00, Oficio: 10.00, "Doble Carta": 15.60 }),
    r(50,   99,   { Carta:  7.50, Oficio:  9.50, "Doble Carta": 14.40 }),
    r(100,  499,  { Carta:  7.00, Oficio:  9.00, "Doble Carta": 13.60 }),
    r(500,  999,  { Carta:  6.50, Oficio:  8.50, "Doble Carta": 13.20 }),
    r(1000, 4999, { Carta:  6.00, Oficio:  8.00, "Doble Carta": 12.80 }),
    r(5000, Infinity, { Carta: 5.50, Oficio:  7.00, "Doble Carta": 12.40 }),
  ],
  /** Color inyección de tinta */
  colorInkjet: [
    r(1,    49,   { Carta:  3.00, Oficio:  4.00, "Doble Carta": 12.00 }),
    r(50,   99,   { Carta:  2.50, Oficio:  3.50, "Doble Carta": 11.50 }),
    r(100,  499,  { Carta:  2.00, Oficio:  3.00, "Doble Carta": 11.00 }),
    r(500,  999,  { Carta:  2.50, Oficio:  3.00, "Doble Carta": 10.50 }),
    r(1000, 4999, { Carta:  2.00, Oficio:  2.50, "Doble Carta": 10.00 }),
    r(5000, Infinity, { Carta: 1.80, Oficio:  2.50, "Doble Carta":  9.50 }),
  ],
};

// ---------------------------------------------------------------------------
// PAPEL OPALINA — Impresión digital
// ---------------------------------------------------------------------------

export const OPALINA = {
  negro: [
    r(1,   50,  { Carta: 4.40, "Doble Carta": 7.20,  "13x19": 30.00 }),
    r(51,  100, { Carta: 3.92, "Doble Carta": 6.40,  "13x19": 26.67 }),
    r(101, Infinity, { Carta: 3.36, "Doble Carta": 6.00, "13x19": 25.00 }),
  ],
  colorLaser: [
    r(1,   50,  { Carta: 12.00, "Doble Carta": 25.00, "13x19": 35.00 }),
    r(51,  100, { Carta: 10.00, "Doble Carta": 20.00, "13x19": 30.00 }),
    r(101, Infinity, { Carta: 8.00, "Doble Carta": 18.00, "13x19": 25.00 }),
  ],
  colorInkjet: [
    r(1,    49,   { Carta:  6.00, Oficio:  8.00, "Doble Carta": 15.00 }),
    r(50,   99,   { Carta:  5.50, Oficio:  7.50, "Doble Carta": 14.50 }),
    r(100,  499,  { Carta:  5.00, Oficio:  7.00, "Doble Carta": 14.00 }),
    r(500,  999,  { Carta:  4.50, Oficio:  6.50, "Doble Carta": 10.50 }),
    r(1000, 4999, { Carta:  4.00, Oficio:  6.00, "Doble Carta": 10.00 }),
    r(5000, Infinity, { Carta: 3.50, Oficio: 5.50, "Doble Carta": 9.50 }),
  ],
};

// ---------------------------------------------------------------------------
// PAPEL AUTOADHESIVO — Impresión digital
// ---------------------------------------------------------------------------

export const AUTOADHESIVO = {
  negro: [
    r(1,   50,  { Carta: 12.00, "Doble Carta": 25.00, "13x19": 35.00 }),
    r(51,  100, { Carta: 10.00, "Doble Carta": 20.00, "13x19": 30.00 }),
    r(101, Infinity, { Carta: 8.00, "Doble Carta": 18.00, "13x19": 28.00 }),
  ],
  colorLaser: [
    r(1,   50,  { Carta: 14.00, "Doble Carta": 16.80, "13x19": 30.00 }),
    r(51,  100, { Carta: 13.60, "Doble Carta": 16.00, "13x19": 28.57 }),
    r(101, Infinity, { Carta: 13.20, "Doble Carta": 15.20, "13x19": 27.14 }),
  ],
};

// ---------------------------------------------------------------------------
// ACETATO TRANSPARENTE — Impresión digital
// ---------------------------------------------------------------------------

export const ACETATO = {
  negro: [
    r(1,   99,  { Carta: 6.00 }),
    r(100, 499, { Carta: 5.50 }),
    r(500, 999, { Carta: 5.00 }),
    r(1000, Infinity, { Carta: 4.00 }),
  ],
  colorLaser: [
    r(1,   49,  { Carta: 12.00 }),
    r(50,  99,  { Carta: 10.00 }),
    r(100, 499, { Carta: 8.00 }),
    r(500, Infinity, { Carta: 8.00 }),
  ],
};

// ---------------------------------------------------------------------------
// BRILLANTE KROMACOTE — Impresión digital (solo color)
// ---------------------------------------------------------------------------

export const KROMACOTE = {
  colorLaser: [
    r(1,   50,  { Carta: 12.00, "Doble Carta": 25.00 }),
    r(51,  100, { Carta: 10.00, "Doble Carta": 20.00 }),
    r(101, Infinity, { Carta: 8.00, "Doble Carta": 18.00 }),
  ],
};

// ---------------------------------------------------------------------------
// BRILLANTE COUCHÉ — Impresión digital (solo color)
// ---------------------------------------------------------------------------

export const COUCHE = {
  colorLaser: [
    r(1,   50,  { Carta: 12.00, "Doble Carta": 25.00, "13x19": 35.00 }),
    r(51,  100, { Carta: 10.00, "Doble Carta": 20.00, "13x19": 30.00 }),
    r(101, Infinity, { Carta: 8.00, "Doble Carta": 18.00, "13x19": 28.00 }),
  ],
};

// ---------------------------------------------------------------------------
// CARTULINA SULFATADA — Impresión digital (solo color)
// ---------------------------------------------------------------------------

export const SULFATADA = {
  colorLaser: [
    r(1,   50,  { Carta: 12.00, "Doble Carta": 25.00, "13x19": 35.00 }),
    r(51,  100, { Carta: 10.00, "Doble Carta": 20.00, "13x19": 30.00 }),
    r(101, Infinity, { Carta: 8.00, "Doble Carta": 18.00, "13x19": 28.00 }),
  ],
};

// ---------------------------------------------------------------------------
// COPIAS (fotocopiadora)
// ---------------------------------------------------------------------------

export const COPIAS = {
  negro: [
    r(1,    99,   { Carta: 1.00, Oficio: 1.50, "Doble Carta": 3.00 }),
    r(100,  499,  { Carta: 0.90, Oficio: 1.00, "Doble Carta": 2.50 }),
    r(500,  999,  { Carta: 0.80, Oficio: 0.90, "Doble Carta": 2.00 }),
    r(1000, 4999, { Carta: 0.70, Oficio: 0.80, "Doble Carta": 1.80 }),
    r(10000, Infinity, { Carta: 0.70, Oficio: 0.80, "Doble Carta": 1.47 }),
  ],
  colorLaser: [
    r(1,    49,   { Carta: 8.00, Oficio: 10.00, "Doble Carta": 15.00 }),
    r(50,   99,   { Carta: 7.50, Oficio: 9.50, "Doble Carta": 14.50 }),
    r(100,  499,  { Carta: 7.00, Oficio: 9.20, "Doble Carta": 14.00 }),
    r(500,  999,  { Carta: 6.50, Oficio: 9.00, "Doble Carta": 13.50 }),
    r(1000, 4999, { Carta: 6.00, Oficio: 8.60, "Doble Carta": 13.00 }),
    r(5000, Infinity, { Carta: 5.50, Oficio: 8.20, "Doble Carta": 12.50 }),
  ],
  colorInkjet: [
    r(1,    49,   { Carta: 3.00, Oficio: 4.00, "Doble Carta": 12.00 }),
    r(50,   99,   { Carta: 2.50, Oficio: 3.50, "Doble Carta": 11.50 }),
    r(100,  499,  { Carta: 2.00, Oficio: 3.00, "Doble Carta": 11.00 }),
    r(500,  999,  { Carta: 2.50, Oficio: 3.00, "Doble Carta": 10.50 }),
    r(1000, 4999, { Carta: 2.00, Oficio: 2.50, "Doble Carta": 10.00 }),
    r(5000, Infinity, { Carta: 1.80, Oficio: 2.50, "Doble Carta": 9.50 }),
  ],
};

// ---------------------------------------------------------------------------
// ENMICADOS
// ---------------------------------------------------------------------------

export const ENMICADOS = [
  r(1,   10,  { Carta: 20, Oficio: 30, "Doble Carta": 45 }),
  r(11,  20,  { Carta: 18, Oficio: 20, "Doble Carta": 30 }),
  r(21,  Infinity, { Carta: 14, Oficio: 17, "Doble Carta": 25 }),
];

// ---------------------------------------------------------------------------
// ENGARGOLADO
// ---------------------------------------------------------------------------

export const ENGARGOLADO = {
  /** Arillo metálico (máx 280 páginas) */
  metalico: [
    r(1,   45,  { price: 25.00 }),
    r(46,  85,  { price: 30.00 }),
    r(86,  105, { price: 31.00 }),
    r(106, 180, { price: 35.00 }),
    r(181, 280, { price: 40.00 }),
  ],
  /** Espiral plástico (máx 500 páginas) */
  plastico: [
    r(0,   30,  { price: 22.00 }),
    r(31,  74,  { price: 23.00 }),
    r(75,  110, { price: 24.00 }),
    r(111, 140, { price: 26.00 }),
    r(141, 160, { price: 28.00 }),
    r(161, 190, { price: 29.00 }),
    r(191, 220, { price: 31.00 }),
    r(221, 250, { price: 33.00 }),
    r(251, 340, { price: 35.00 }),
    r(341, 440, { price: 40.00 }),
    r(441, 450, { price: 40.00 }),
    r(451, 500, { price: 50.00 }),
  ],
};

// ---------------------------------------------------------------------------
// ESCANEOS
// ---------------------------------------------------------------------------

export const ESCANEOS = {
  /** Carta y Oficio */
  cartaOficio: [
    r(1,    50,   { price: 3.00 }),
    r(51,   100,  { price: 2.27 }),
    r(101,  200,  { price: 1.47 }),
    r(201,  500,  { price: 0.95 }),
    r(501,  1000, { price: 0.62 }),
    r(1001, Infinity, { price: 0.40 }),
  ],
  /** Doble Carta */
  doble: [
    r(1,    50,   { price: 6.00 }),
    r(51,   100,  { price: 5.00 }),
    r(101,  200,  { price: 4.00 }),
    r(201,  500,  { price: 3.00 }),
    r(501,  1000, { price: 2.00 }),
    r(1001, Infinity, { price: 1.00 }),
  ],
  /** Plano A3, A2, A1, A0 */
  plano: [
    r(1,    50,   { price: 30.00 }),
    r(51,   100,  { price: 25.00 }),
    r(101,  200,  { price: 20.00 }),
    r(201,  500,  { price: 15.00 }),
    r(501,  1000, { price: 10.00 }),
    r(1001, Infinity, { price:  6.00 }),
  ],
};

// ---------------------------------------------------------------------------
// FOTOBOTONES
// ---------------------------------------------------------------------------

export const FOTOBOTONES = {
  /** Pin normal 5.8 cm */
  pin: [
    r(1,   10,  { price: 17.00 }),
    r(11,  50,  { price: 15.00 }),
    r(51,  100, { price: 13.42 }),
    r(101, 200, { price: 10.99 }),
    r(201, Infinity, { price:  9.00 }),
  ],
  /** Destapador 5.8 cm */
  destapador: [
    r(1,   10,  { price: 20.00 }),
    r(11,  50,  { price: 15.00 }),
    r(51,  100, { price: 13.42 }),
    r(101, 200, { price: 10.99 }),
    r(201, Infinity, { price:  9.00 }),
  ],
  /** Imantado 5.8 cm */
  imantado: [
    r(1,   10,  { price: 25.00 }),
    r(11,  50,  { price: 20.00 }),
    r(51,  100, { price: 15.00 }),
    r(101, 200, { price: 12.00 }),
    r(201, Infinity, { price: 10.00 }),
  ],
  /** Llavero 5.8 cm */
  llavero: [
    r(1,   10,  { price: 28.00 }),
    r(11,  50,  { price: 22.00 }),
    r(51,  100, { price: 17.00 }),
    r(101, 200, { price: 15.00 }),
    r(201, Infinity, { price: 12.00 }),
  ],
};

// ---------------------------------------------------------------------------
// CREDENCIALES PVC
// ---------------------------------------------------------------------------

export const CREDENCIALES_PVC = {
  /** Un solo lado */
  unLado: {
    normal:     [r(1, 10, { price: 30 }), r(11, 25, { price: 25 }), r(26, 100, { price: 20 }), r(101, Infinity, { price: 18 })],
    perforada:  [r(1, 10, { price: 32 }), r(11, 25, { price: 27 }), r(26, 100, { price: 22 }), r(101, Infinity, { price: 20 })],
    nfc:        [r(1, 10, { price: 40 }), r(11, 25, { price: 35 }), r(26, 100, { price: 30 }), r(101, Infinity, { price: 25 })],
    magnetica:  [r(1, 10, { price: 45 }), r(11, 25, { price: 40 }), r(26, 100, { price: 35 }), r(101, Infinity, { price: 30 })],
  },
  /** Ambos lados */
  ambosLados: {
    normal:     [r(1, 10, { price: 50 }), r(11, 25, { price: 45 }), r(26, 100, { price: 30 }), r(101, Infinity, { price: 25 })],
    perforada:  [r(1, 10, { price: 52 }), r(11, 25, { price: 47 }), r(26, 100, { price: 32 }), r(101, Infinity, { price: 30 })],
    nfc:        [r(1, 10, { price: 55 }), r(11, 25, { price: 50 }), r(26, 100, { price: 45 }), r(101, Infinity, { price: 35 })],
    magnetica:  [r(1, 10, { price: 57 }), r(11, 25, { price: 50 }), r(26, 100, { price: 46 }), r(101, Infinity, { price: 40 })],
  },
};

// ---------------------------------------------------------------------------
// SUBLIMACIÓN
// ---------------------------------------------------------------------------

export const SUBLIMACION = {
  playeraNino: [
    r(1,  2,  { price: 250 }),
    r(3,  5,  { price: 200 }),
    r(6,  10, { price: 180 }),
    r(11, Infinity, { price: 150 }),
  ],
  playeraChica: [
    r(1,  2,  { price: 280 }),
    r(3,  5,  { price: 220 }),
    r(6,  10, { price: 200 }),
    r(11, Infinity, { price: 150 }),
  ],
  playeraMediana: [
    r(1,  2,  { price: 280 }),
    r(3,  5,  { price: 220 }),
    r(6,  10, { price: 200 }),
    r(11, Infinity, { price: 150 }),
  ],
  playeraGrande: [
    r(1,  2,  { price: 280 }),
    r(3,  5,  { price: 220 }),
    r(6,  10, { price: 200 }),
    r(11, Infinity, { price: 150 }),
  ],
  taza: [
    r(1,  5,  { price: 60 }),
    r(6,  15, { price: 55 }),
    r(16, 25, { price: 50 }),
    r(26, 30, { price: 40 }),
    r(31, Infinity, { price: 30 }),
  ],
  tazaMagica: [
    r(1,  5,  { price: 95 }),
    r(6,  15, { price: 85 }),
    r(16, 25, { price: 80 }),
    r(26, 30, { price: 70 }),
    r(31, Infinity, { price: 60 }),
  ],
  termo: [
    r(1,  5,  { price: 450 }),
    r(6,  15, { price: 420 }),
    r(16, 25, { price: 400 }),
    r(26, 30, { price: 380 }),
    r(31, Infinity, { price: 350 }),
  ],
};

// ---------------------------------------------------------------------------
// LAMINADO (rollos — metro lineal)
// ---------------------------------------------------------------------------

export const LAMINADO = {
  /** Ancho máximo del rollo en cm */
  rollWidth: {
    brillante: 61,
    mate: 28,
  },
  /** Precio por metro lineal */
  precioML: {
    brillante: { "1.5": 60, "5": 105 },
    mate:      { "1.5": 60 },
  },
};

// ---------------------------------------------------------------------------
// Mapa de papel → tabla de precios (para PrintOptionsEditor)
// ---------------------------------------------------------------------------

export const PAPER_PRICE_MAP = {
  "Bond 75 g":             BOND,
  "Bond 90 g":             BOND,
  "Opalina 115 g":         OPALINA,
  "Opalina 225 g":         OPALINA,
  "Couché 130 g":          COUCHE,
  "Couché 300 g":          COUCHE,
  "Kromacote 300 g":       KROMACOTE,
  "Cartulina sulfatada 300 g": SULFATADA,
  "Adhesivo mate":         AUTOADHESIVO,
  "Adhesivo brillante":    AUTOADHESIVO,
  "Adhesivo transparente": AUTOADHESIVO,
  "Acetato":               ACETATO,
};

/**
 * Normaliza el modo de color al key usado en las tablas de precios.
 * @param {'color'|'bn'} colorMode
 * @param {'laser'|'inkjet'} [tech]
 * @returns {'negro'|'colorLaser'|'colorInkjet'}
 */
export function normalizeColorMode(colorMode, tech = "laser") {
  if (colorMode === "bn") return "negro";
  return tech === "inkjet" ? "colorInkjet" : "colorLaser";
}

/**
 * Obtiene el precio unitario de impresión digital dado papel, cantidad, formato y modo.
 * @param {string} paper - Nombre del papel (ej. "Bond 75 g")
 * @param {number} qty   - Cantidad de hojas
 * @param {string} format - "Carta" | "Oficio" | "Doble Carta" | "13x19"
 * @param {'negro'|'colorLaser'|'colorInkjet'} mode
 * @returns {number|null}
 */
export function getPrintPrice(paper, qty, format, mode) {
  const table = PAPER_PRICE_MAP[paper];
  if (!table) return null;
  const modeTable = table[mode];
  if (!modeTable) return null;
  return lookupPrice(modeTable, qty, format);
}
