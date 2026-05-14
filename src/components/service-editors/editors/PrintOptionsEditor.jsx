import { useMemo } from "react";
import LaminadoOptions from "./LaminadoOptions";
import { calculateLaminationCost } from "./LaminadoOptions";
import {
  getPrintPrice,
  ENMICADOS,
  ENGARGOLADO,
  lookupPrice,
} from "../../../data/priceList";

// ---------------------------------------------------------------------------
// Constantes de cotización
// ---------------------------------------------------------------------------

/** Dimensiones físicas de cada tamaño comercial en cm [ancho, alto] */
const SIZE_DIMS = {
  "1/4 Carta":   [10.8, 13.9],
  "1/2 Carta":   [13.9, 21.6],
  Carta:         [21.6, 27.9],
  Oficio:        [21.6, 33.0],
  "Doble Carta": [27.9, 43.2],
  "11x17":       [27.9, 43.2],
  "12x18":       [30.5, 45.7],
  "13x19":       [33.0, 48.3],
};

/** Normaliza el tamaño al formato que usa la tabla de precios */
const SIZE_TO_FORMAT = {
  "1/4 Carta": "Carta",
  "1/2 Carta": "Carta",
  Carta:        "Carta",
  Oficio:       "Oficio",
  "Doble Carta": "Doble Carta",
  "11x17":      "Doble Carta",
  "12x18":      "Doble Carta",
  "13x19":      "13x19",
};

/** Papeles que solo tienen impresión a color (sin tabla "negro") */
const COLOR_ONLY_PAPERS = new Set([
  "Kromacote 300 g",
  "Couché 130 g",
  "Couché 300 g",
  "Cartulina sulfatada 300 g",
]);

/** Papeles que tienen tarifa de inyección de tinta además de láser */
const INKJET_PAPERS = new Set([
  "Bond 75 g",
  "Bond 90 g",
  "Opalina 115 g",
  "Opalina 225 g",
]);

/** Devuelve la clave de modo de color para la tabla de precios */
function getColorKey(colorMode, paper, tech) {
  if (colorMode === "bn") return "negro";
  if (INKJET_PAPERS.has(paper) && tech === "inkjet") return "colorInkjet";
  return "colorLaser";
}

/** Normaliza el tamaño de enmicado al formato de la tabla */
const ENM_SIZE_TO_FORMAT = {
  Credencial:   "Carta",
  "1/4 carta":  "Carta",
  "1/2 carta":  "Carta",
  Carta:        "Carta",
  Oficio:       "Oficio",
  Tabloide:     "Doble Carta",
};

/**
 * Dada la dimensión de una página (en cm), devuelve el nombre del tamaño
 * comercial más cercano (con tolerancia ±1.5 cm en cada lado).
 * Prueba ambas orientaciones (portrait / landscape).
 */
function findRecommendedSize(wCm, hCm) {
  if (!wCm || !hCm) return null;
  const TOLERANCE = 1.5;
  for (const [name, [dw, dh]] of Object.entries(SIZE_DIMS)) {
    const matchPortrait  = Math.abs(wCm - dw) < TOLERANCE && Math.abs(hCm - dh) < TOLERANCE;
    const matchLandscape = Math.abs(wCm - dh) < TOLERANCE && Math.abs(hCm - dw) < TOLERANCE;
    if (matchPortrait || matchLandscape) return name;
  }
  return null;
}

/**
 * Cuenta páginas únicas en un string de rango ("1-3,7,10-12" → 7).
 * Respeta el máximo del documento.
 */
function countPagesInRange(rangeStr, maxPages) {
  if (!rangeStr || !rangeStr.trim()) return 0;
  const pages = new Set();
  for (const part of rangeStr.split(",")) {
    const t = part.trim();
    if (!t) continue;
    if (t.includes("-")) {
      const [a, b] = t.split("-").map(Number);
      for (let i = Math.max(1, a || 1); i <= Math.min(maxPages, b || maxPages); i++) pages.add(i);
    } else {
      const n = Number(t);
      if (n >= 1 && n <= maxPages) pages.add(n);
    }
  }
  return pages.size;
}

/** Páginas efectivas según el modo seleccionado */
function effectivePages(pageMode, pageRange, pageCount) {
  const total = pageCount || 1;
  if (pageMode === "actual") return 1;
  if (pageMode === "rango") {
    const n = countPagesInRange(pageRange, total);
    return n > 0 ? n : 1;
  }
  return total; // "todas" (default)
}

// ---------------------------------------------------------------------------
// Pequeño helper de UI para etiquetas con "(opcional)"
// ---------------------------------------------------------------------------
function Label({ children, optional = false }) {
  return (
    <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1 flex items-center gap-2">
      {children}
      {optional && (
        <span className="normal-case tracking-normal text-slate-500 font-normal text-[10px]">
          (opcional)
        </span>
      )}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function PrintOptionsEditor({ opts, pageCount, onChangeOptions, item }) {
  const finishes   = opts.finishes || {};
  const lam        = finishes.laminado    || {};
  const enm        = finishes.enmicado    || {};
  const eng        = finishes.engargolado || {};
  const extras     = finishes.extras      || {};

  const update = (patch) => onChangeOptions({ ...patch });

  const updateFinishes = (patch) => {
    onChangeOptions({
      finishes: {
        laminado: lam,
        enmicado: enm,
        engargolado: eng,
        extras,
        ...patch,
      },
    });
  };

  const jobType   = opts.printJobType || "documentos";
  const sets      = opts.printSets ?? 1;
  const collate   = opts.printCollate || "juegos";
  const paper     = opts.paper || "Bond 75 g";
  const colorMode = opts.colorMode || "color";
  const tech      = opts.printTech || "laser";

  const isColorOnly    = COLOR_ONLY_PAPERS.has(paper);
  const showTechToggle = colorMode === "color" && INKJET_PAPERS.has(paper);

  // Tamaño recomendado a partir de las dimensiones reales del archivo
  const recommendedSize = useMemo(
    () => findRecommendedSize(item?.pageWidthCm, item?.pageHeightCm),
    [item?.pageWidthCm, item?.pageHeightCm]
  );

  // ---------------------------------------------------------------------------
  // Cálculo de desglose de precio
  // ---------------------------------------------------------------------------
  const breakdown = useMemo(() => {
    const pricingSize = SIZE_TO_FORMAT[opts.size || "Carta"];
    const nUp      = opts.nUp || 1;
    const isDuplex = opts.duplex && opts.duplex !== "simple";

    const pages = effectivePages(opts.pageMode || "todas", opts.pageRange || "", pageCount);

    const sheetsPerSet = isDuplex
      ? Math.ceil(pages / (nUp * 2))
      : Math.ceil(pages / nUp);

    const totalSheets = sheetsPerSet * sets;

    const colorKey = getColorKey(colorMode, paper, tech);

    const lines  = [];
    let hasQuote = false;

    // ── Impresión base ─────────────────────────────────────
    if (pricingSize) {
      const unitPrice = getPrintPrice(paper, totalSheets, pricingSize, colorKey);
      if (unitPrice !== null) {
        const modeLabel = colorMode === "bn" ? "B&N" : tech === "inkjet" ? "Inyección" : "Láser";
        let detail;
        if (sets > 1) {
          detail = `${pages} pág × ${sets} juegos`;
          if (isDuplex || nUp > 1) detail += ` → ${sheetsPerSet} hoja${sheetsPerSet !== 1 ? "s" : ""}/juego`;
          detail += ` = ${totalSheets} hojas × $${unitPrice.toFixed(2)} (${modeLabel})`;
        } else {
          detail = `${pages} pág`;
          if (isDuplex || nUp > 1) detail += ` → ${totalSheets} hoja${totalSheets !== 1 ? "s" : ""}`;
          detail += ` × $${unitPrice.toFixed(2)} (${modeLabel})`;
        }
        lines.push({ label: `${paper} — ${pricingSize}`, detail, amount: unitPrice * totalSheets, type: "print" });
      }
    }

    // ── Laminado ───────────────────────────────────────────
    if (lam.enabled) {
      // Si "todas las hojas", usar dims del tamaño de papel y totalSheets como cantidad
      const lamSize = SIZE_TO_FORMAT[opts.size || "Carta"];
      const SIZE_DIMS_LAM = {
        "1/4 Carta":   [10.8, 13.9],
        "1/2 Carta":   [13.9, 21.6],
        Carta:         [21.6, 27.9],
        Oficio:        [21.6, 33.0],
        "Doble Carta": [27.9, 43.2],
        "11x17":       [27.9, 43.2],
        "12x18":       [30.5, 45.7],
        "13x19":       [33.0, 48.3],
      };
      const lamDims = SIZE_DIMS_LAM[opts.size || "Carta"] || [21.6, 27.9];
      const pw = lam.allSheets ? lamDims[0] : parseFloat(lam.pieceWidth);
      const pl = lam.allSheets ? lamDims[1] : parseFloat(lam.pieceLength);
      const lamQty = lam.allSheets ? totalSheets : (lam.quantity || sets);

      if (pw > 0 && pl > 0) {
        const lamResult = calculateLaminationCost({
          tipo: lam.tipo || "brillante", grosor: lam.grosor || "1.5",
          pieceWidth: pw, pieceLength: pl, quantity: lamQty,
        });
        if (lamResult) {
          const lamLabel = lam.allSheets
            ? `Laminado ${lam.tipo || "brillante"} ${lam.grosor || "1.5"} mil — todas las hojas`
            : `Laminado ${lam.tipo || "brillante"} ${lam.grosor || "1.5"} mil`;
          lines.push({
            label:  lamLabel,
            detail: `${lamQty} pieza${lamQty !== 1 ? "s" : ""} · ${lamResult.piecesAcross}/fila · ${lamResult.totalLinearMeters.toFixed(2)} m × $${lamResult.pricePerMeter}/m`,
            amount: lamResult.totalCost,
            type: "finish",
          });
        }
      } else {
        lines.push({ label: `Laminado ${lam.tipo || "brillante"}`, detail: "Indica dimensiones de la pieza", amount: null, type: "finish" });
        hasQuote = true;
      }
    }

    // ── Enmicado ───────────────────────────────────────────
    if (enm.enabled) {
      const enmFmt  = ENM_SIZE_TO_FORMAT[enm.size] || "Carta";
      const enmUnit = lookupPrice(ENMICADOS, sets, enmFmt);
      if (enmUnit !== null) {
        lines.push({
          label:  `Enmicado ${enm.size || "Carta"} (${enm.finish || "Brillante"})`,
          detail: `${sets} pieza${sets !== 1 ? "s" : ""} × $${enmUnit.toFixed(2)}`,
          amount: enmUnit * sets, type: "finish",
        });
      }
    }

    // ── Engargolado ────────────────────────────────────────
    if (eng.enabled) {
      const engTable = eng.tipo === "Arillo metálico" ? ENGARGOLADO.metalico : ENGARGOLADO.plastico;
      const engUnit  = lookupPrice(engTable, pageCount || 1, "price");
      if (engUnit !== null) {
        lines.push({
          label:  `Engargolado ${eng.tipo || "Espiral plástico"} — ${eng.lado || "Lado largo"}`,
          detail: `${sets} juego${sets !== 1 ? "s" : ""} × $${engUnit.toFixed(2)}`,
          amount: engUnit * sets, type: "finish",
        });
      }
    }

    // ── Perforado ──────────────────────────────────────────
    if (extras.perforado) {
      const hoyos = extras.perforadoHoyos || "2";
      if (totalSheets >= 50) {
        const bloques = Math.ceil(totalSheets / 50);
        const perforadoCost = bloques * 5;
        lines.push({
          label:  `Perforado ${hoyos} hoyos`,
          detail: `${totalSheets} hojas → ${bloques} bloque${bloques !== 1 ? "s" : ""} de 50 × $5`,
          amount: perforadoCost,
          type:   "finish",
        });
      } else {
        lines.push({
          label:  `Perforado ${hoyos} hoyos`,
          detail: `${totalSheets} hojas (menos de 50 — sin costo)`,
          amount: 0,
          type:   "finish",
        });
      }
    }

    // ── Entrega: Folder o Carpeta ──────────────────────────
    if (extras.entrega === "folder") {
      const folderSize  = extras.folderSize || "Carta";
      const folderPrice = folderSize === "Oficio" ? 5.5 : 4;
      lines.push({
        label:  `Folder ${folderSize}`,
        detail: `Folder tamaño ${folderSize}`,
        amount: folderPrice,
        type:   "finish",
      });
    } else if (extras.entrega === "carpeta") {
      const CARPETA_PRICES = { "1/2": 75, "1": 85, "2": 125, "3": 150, "5": 350 };
      const carpetaSize  = extras.carpetaSize || "1";
      const carpetaPrice = CARPETA_PRICES[carpetaSize] ?? null;
      if (carpetaPrice !== null) {
        lines.push({
          label:  `Carpeta ${carpetaSize}"`,
          detail: `Carpeta de ${carpetaSize} pulgada${carpetaSize !== "1" ? "s" : ""}`,
          amount: carpetaPrice,
          type:   "finish",
        });
      }
    }

    const total = lines.reduce((s, l) => s + (l.amount ?? 0), 0);
    return { lines, total, hasQuote, pages, sheetsPerSet, totalSheets };
  }, [
    opts.size, opts.nUp, opts.duplex, opts.pageMode, opts.pageRange,
    pageCount, sets, paper, colorMode, tech,
    lam, enm, eng,
    extras.perforado, extras.perforadoHoyos,
    extras.entrega, extras.folderSize, extras.carpetaSize,
  ]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4 text-[13px] leading-snug">

      {/* ── Impresión: Color / B&N ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Impresión</Label>
          <div className="chips">
            <button type="button"
              className={`chip text-[11px] py-1.5 ${colorMode === "color" ? "chip-active" : ""}`}
              onClick={() => update({ colorMode: "color" })}>
              Color
            </button>
            <button type="button"
              className={`chip text-[11px] py-1.5 ${colorMode === "bn" ? "chip-active" : ""}`}
              onClick={() => update({ colorMode: "bn" })}>
              Blanco y negro
            </button>
          </div>

          {/* Tecnología: Inyección / Láser — solo cuando aplica */}
          {showTechToggle && (
            <div className="pt-1">
              <p className="text-[10px] text-slate-400 mb-1.5">Tecnología</p>
              <div className="chips">
                <button type="button"
                  className={`chip text-[11px] py-1.5 ${tech === "inkjet" ? "chip-active" : ""}`}
                  onClick={() => update({ printTech: "inkjet" })}>
                  Inyección de tinta
                </button>
                <button type="button"
                  className={`chip text-[11px] py-1.5 ${tech === "laser" ? "chip-active" : ""}`}
                  onClick={() => update({ printTech: "laser" })}>
                  Láser
                </button>
              </div>
            </div>
          )}

          {/* Aviso: papel solo disponible en color */}
          {colorMode === "bn" && isColorOnly && (
            <p className="text-[11px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 mt-1">
              Este papel solo está disponible en <strong>color</strong>.
            </p>
          )}
        </div>

        <div>
          <Label optional>Tipo de trabajo</Label>
          <div className="chips flex flex-wrap gap-2">
            {[
              ["documentos", "Documentos normales"],
              ["volantes",   "Volantes / flyers"],
              ["tripticos",  "Dípticos / trípticos"],
              ["menus",      "Menús / cartas"],
            ].map(([val, label]) => (
              <button key={val} type="button"
                className={`chip text-[11px] py-1.5 ${jobType === val ? "chip-active" : ""}`}
                onClick={() => update({ printJobType: val })}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* ── Tamaño / Papel ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Tamaño (papel comercial)</Label>

          {/* Recomendado según dimensiones del archivo */}
          {recommendedSize && opts.size !== recommendedSize && (
            <p className="text-[10px] text-sky-400 mb-1.5">
              Tu archivo mide aprox.{" "}
              <span className="font-medium">
                {item.pageWidthCm} × {item.pageHeightCm} cm
              </span>{" "}
              →{" "}
              <button
                type="button"
                className="underline hover:text-sky-300"
                onClick={() => update({ size: recommendedSize })}
              >
                usar {recommendedSize} (recomendado)
              </button>
            </p>
          )}
          {recommendedSize && opts.size === recommendedSize && (
            <p className="text-[10px] text-emerald-400 mb-1.5">
              Tamaño recomendado para tu archivo ✓
            </p>
          )}

          <select
            className="select text-[13px] h-9 py-1.5"
            value={opts.size || "Carta"}
            onChange={(e) => update({ size: e.target.value })}
          >
            {Object.entries(SIZE_DIMS).map(([name, [w, h]]) => (
              <option key={name} value={name}>
                {name} ({w} × {h} cm)
                {recommendedSize === name ? " ★" : ""}
              </option>
            ))}
            <option value="Personalizado">Tamaño personalizado</option>
          </select>

          {opts.size === "Personalizado" && (
            <input
              className="input mt-2 text-[13px] h-9 py-1.5"
              placeholder="Ej. 20 × 30 cm"
              value={opts.customSize || ""}
              onChange={(e) => update({ customSize: e.target.value })}
            />
          )}
        </div>

        <div>
          <Label>Tipo de papel</Label>
          <select
            className="select text-[13px] h-9 py-1.5"
            value={paper}
            onChange={(e) => update({ paper: e.target.value })}
          >
            <option>Bond 75 g</option>
            <option>Bond 90 g</option>
            <option>Opalina 115 g</option>
            <option>Opalina 225 g</option>
            <option>Couché 130 g</option>
            <option>Couché 300 g</option>
            <option>Kromacote 300 g</option>
            <option>Cartulina sulfatada 300 g</option>
            <option>Adhesivo mate</option>
            <option>Adhesivo brillante</option>
            <option>Adhesivo transparente</option>
            <option>Acetato</option>
          </select>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* ── Contador de hojas del archivo ───────────────── */}
      <div className="flex items-center gap-3 rounded-xl bg-slate-800/60 border border-slate-700/40 px-4 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Hojas detectadas en el archivo
          </p>
          <p className="text-[22px] font-bold text-white tabular-nums leading-tight mt-0.5">
            {pageCount}
            <span className="text-[13px] font-normal text-slate-400 ml-1.5">
              {pageCount === 1 ? "hoja" : "hojas"}
            </span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] text-slate-500">A imprimir</p>
          <p className="text-[18px] font-semibold text-emerald-400 tabular-nums leading-tight">
            {breakdown.pages}
            <span className="text-[12px] font-normal text-slate-400 ml-1">
              {breakdown.pages === 1 ? "pág" : "págs"}
            </span>
          </p>
        </div>
      </div>

      {/* ── Páginas / Dúplex ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label optional>Páginas a imprimir</Label>
          <div className="chips">
            {[
              ["todas",  "Todas"],
              ["actual", "Actual (1 pág)"],
              ["rango",  "Rango"],
            ].map(([val, label]) => (
              <button key={val} type="button"
                className={`chip text-[11px] py-1.5 ${(opts.pageMode || "todas") === val ? "chip-active" : ""}`}
                onClick={() => update({ pageMode: val })}>
                {label}
              </button>
            ))}
          </div>
          {opts.pageMode === "rango" && (
            <input
              className="input mt-2 text-[13px] h-9 py-1.5"
              placeholder="Ej. 1-3,7,10-12"
              value={opts.pageRange || ""}
              onChange={(e) => update({ pageRange: e.target.value })}
            />
          )}
          {pageCount > 1 && (opts.pageMode || "todas") === "todas" && (
            <p className="mt-1 text-[10px] text-slate-500">
              Se imprimirán las {pageCount} páginas del archivo.
            </p>
          )}
        </div>

        {pageCount > 1 && (
          <div>
            <Label optional>Dúplex</Label>
            <select
              className="select text-[13px] h-9 py-1.5"
              value={opts.duplex || "simple"}
              onChange={(e) => update({ duplex: e.target.value })}
            >
              <option value="simple">Un solo lado</option>
              <option value="duplex-largo">Ambos lados (como libro)</option>
              <option value="duplex-corto">Ambos lados (como libreta)</option>
            </select>
          </div>
        )}
      </div>

      <div className="h-px bg-white/10" />

      {/* ── Distribución / Escala ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label optional>Distribución</Label>
          <div className="space-y-2 text-[12px]">
            <label className="inline-flex items-center gap-2 text-slate-200/90">
              <input type="checkbox"
                checked={!!opts.booklet}
                onChange={(e) => update({ booklet: e.target.checked })} />
              Imprimir como folleto / revista
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-slate-200/90">Múltiple por hoja</span>
              <input type="number" min={1} max={16}
                className="input w-20 text-[13px] h-8 py-1"
                value={opts.nUp || 1}
                onChange={(e) => update({ nUp: Math.max(1, Math.min(16, Number(e.target.value) || 1)) })} />
              <span className="text-[11px] text-slate-300/80">pág/hoja</span>
            </div>
          </div>
        </div>

        <div>
          <Label optional>Escala</Label>
          <div className="chips">
            {[
              ["real",          "Tamaño real"],
              ["ajustar",       "Ajustar a la hoja"],
              ["personalizado", "Personalizada"],
            ].map(([val, label]) => (
              <button key={val} type="button"
                className={`chip text-[11px] py-1.5 ${(opts.scaleMode || "ajustar") === val ? "chip-active" : ""}`}
                onClick={() => update({ scaleMode: val, ...(val === "personalizado" ? { scalePercent: opts.scalePercent || 100 } : {}) })}>
                {label}
              </button>
            ))}
          </div>
          {opts.scaleMode === "personalizado" && (
            <div className="mt-2 flex items-center gap-2">
              <input type="number" className="input w-24 text-[13px] h-8 py-1"
                min={10} max={400}
                value={opts.scalePercent || 100}
                onChange={(e) => update({ scalePercent: Math.max(10, Math.min(400, Number(e.target.value) || 100)) })} />
              <span className="text-[11px] text-slate-300/80">%</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* ── Cantidad de juegos / Orden ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label optional>Cantidad de juegos</Label>
          <input type="number" min={1}
            className="input h-9 py-1.5 text-[13px]"
            value={sets}
            onChange={(e) => update({ printSets: Math.max(1, Number(e.target.value) || 1) })} />
          <p className="mt-1 text-[11px] text-slate-400">
            Ej. 10 juegos iguales del mismo archivo.
          </p>
        </div>

        <div>
          <Label optional>Orden de impresión</Label>
          <div className="chips flex flex-wrap gap-2">
            <button type="button"
              className={`chip text-[11px] py-1.5 ${collate === "juegos" ? "chip-active" : ""}`}
              onClick={() => update({ printCollate: "juegos" })}>
              Por juegos (1–2–3 / 1–2–3…)
            </button>
            <button type="button"
              className={`chip text-[11px] py-1.5 ${collate === "paginas" ? "chip-active" : ""}`}
              onClick={() => update({ printCollate: "paginas" })}>
              Por páginas (1–1–1 / 2–2–2…)
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* ── Orientación ──────────────────────────────────── */}
      <div>
        <Label optional>Orientación</Label>
        <select
          className="select text-[13px] h-9 py-1.5"
          value={opts.orientation || "auto"}
          onChange={(e) => update({ orientation: e.target.value })}>
          <option value="auto">Automática</option>
          <option value="vertical">Vertical</option>
          <option value="horizontal">Horizontal</option>
        </select>
      </div>

      <div className="h-px bg-white/10" />

      {/* ── Finalizados ──────────────────────────────────── */}
      <div className="card card--glass-dark p-4 space-y-4">
        <h5 className="text-[11px] font-semibold text-white/90 uppercase tracking-[0.18em] flex items-center gap-2">
          Finalizados
          <span className="normal-case tracking-normal text-slate-500 font-normal text-[10px]">(opcional)</span>
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
          <LaminadoOptions
            lam={lam}
            enm={enm}
            updateFinishes={updateFinishes}
            paperSize={opts.size || "Carta"}
            totalSheets={breakdown.totalSheets}
          />

          {/* Enmicado */}
          <div className="space-y-2">
            <Label>Enmicado</Label>
            <label className="inline-flex items-center gap-2 text-slate-200/90 text-[12px]">
              <input type="checkbox" checked={!!enm.enabled}
                onChange={(e) => updateFinishes({
                  enmicado: { ...enm, enabled: e.target.checked },
                  laminado: { ...lam, enabled: e.target.checked ? false : lam.enabled },
                })} />
              Activar enmicado
            </label>
            {enm.enabled && (
              <>
                <select className="select text-[13px] h-9 py-1.5"
                  value={enm.size || "Carta"}
                  onChange={(e) => updateFinishes({ enmicado: { ...enm, enabled: true, size: e.target.value } })}>
                  <option>Credencial</option>
                  <option>1/4 carta</option>
                  <option>1/2 carta</option>
                  <option>Carta</option>
                  <option>Oficio</option>
                  <option>Tabloide</option>
                </select>
                <select className="select mt-2 text-[13px] h-9 py-1.5"
                  value={enm.finish || "Brillante"}
                  onChange={(e) => updateFinishes({ enmicado: { ...enm, enabled: true, finish: e.target.value } })}>
                  <option>Brillante</option>
                  <option>Mate</option>
                </select>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
          {/* Engargolado */}
          <div className="space-y-2">
            <Label>Engargolado</Label>
            <label className="inline-flex items-center gap-2 text-slate-200/90 text-[12px]">
              <input type="checkbox" checked={!!eng.enabled}
                onChange={(e) => updateFinishes({ engargolado: { ...eng, enabled: e.target.checked } })} />
              Activar engargolado
            </label>
            {eng.enabled && (
              <>
                <select className="select text-[13px] h-9 py-1.5"
                  value={eng.tipo || "Espiral plástico"}
                  onChange={(e) => updateFinishes({ engargolado: { ...eng, enabled: true, tipo: e.target.value } })}>
                  <option>Espiral plástico</option>
                  <option>Arillo metálico</option>
                </select>
                <select className="select mt-2 text-[13px] h-9 py-1.5"
                  value={eng.lado || "Lado largo"}
                  onChange={(e) => updateFinishes({ engargolado: { ...eng, enabled: true, lado: e.target.value } })}>
                  <option>Lado largo</option>
                  <option>Lado corto</option>
                </select>
              </>
            )}
          </div>

          {/* Extras */}
          <div className="space-y-3">
            <Label>Extras</Label>

            {/* ── Perforado ── */}
            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-2 text-slate-200/90 text-[12px]">
                <input type="checkbox" checked={!!extras.perforado}
                  onChange={(e) => updateFinishes({ extras: { ...extras, perforado: e.target.checked } })} />
                Perforado
              </label>
              {extras.perforado && (
                <div className="ml-5 space-y-1.5">
                  <p className="text-[10px] text-slate-400">¿Cuántos hoyos?</p>
                  <div className="chips">
                    {["2", "3"].map((h) => (
                      <button key={h} type="button"
                        className={`chip text-[11px] py-1 ${(extras.perforadoHoyos || "2") === h ? "chip-active" : ""}`}
                        onClick={() => updateFinishes({ extras: { ...extras, perforadoHoyos: h } })}>
                        {h} hoyos
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    $5 por cada 50 hojas · {breakdown.totalSheets < 50
                      ? "menos de 50 hojas, sin costo"
                      : `${breakdown.totalSheets} hojas → $${Math.ceil(breakdown.totalSheets / 50) * 5}`}
                  </p>
                </div>
              )}
            </div>

            {/* ── Entrega: Folder / Carpeta ── */}
            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-2 text-slate-200/90 text-[12px]">
                <input type="checkbox"
                  checked={!!extras.entrega}
                  onChange={(e) => updateFinishes({ extras: { ...extras, entrega: e.target.checked ? "folder" : null } })} />
                Entregar en folder / carpeta
              </label>
              {extras.entrega && (
                <div className="ml-5 space-y-2">
                  <div className="chips">
                    <button type="button"
                      className={`chip text-[11px] py-1 ${extras.entrega === "folder" ? "chip-active" : ""}`}
                      onClick={() => updateFinishes({ extras: { ...extras, entrega: "folder" } })}>
                      Folder
                    </button>
                    <button type="button"
                      className={`chip text-[11px] py-1 ${extras.entrega === "carpeta" ? "chip-active" : ""}`}
                      onClick={() => updateFinishes({ extras: { ...extras, entrega: "carpeta" } })}>
                      Carpeta
                    </button>
                  </div>

                  {extras.entrega === "folder" && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400">Tamaño del folder</p>
                      <div className="chips">
                        {[["Carta", "$4.00"], ["Oficio", "$5.50"]].map(([sz, pr]) => (
                          <button key={sz} type="button"
                            className={`chip text-[11px] py-1 ${(extras.folderSize || "Carta") === sz ? "chip-active" : ""}`}
                            onClick={() => updateFinishes({ extras: { ...extras, folderSize: sz } })}>
                            {sz} <span className="text-slate-400 ml-0.5">{pr}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {extras.entrega === "carpeta" && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400">Tamaño de la carpeta</p>
                      <div className="chips flex-wrap">
                        {[
                          ["1/2", "$75"],
                          ["1",   "$85"],
                          ["2",   "$125"],
                          ["3",   "$150"],
                          ["5",   "$350"],
                        ].map(([sz, pr]) => (
                          <button key={sz} type="button"
                            className={`chip text-[11px] py-1 ${(extras.carpetaSize || "1") === sz ? "chip-active" : ""}`}
                            onClick={() => updateFinishes({ extras: { ...extras, carpetaSize: sz } })}>
                            {sz}" <span className="text-slate-400 ml-0.5">{pr}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Desglose de precio ───────────────────────────── */}
      {breakdown.lines.length > 0 && (
        <>
          <div className="h-px bg-white/10" />

          <div className="card card--glass-dark p-4 space-y-3">
            <h5 className="text-[11px] font-semibold text-white/90 uppercase tracking-[0.18em]">
              Desglose de precio
            </h5>

            <div className="space-y-2">
              {breakdown.lines.map((line, i) => (
                <div key={i}>
                  <div className="flex justify-between items-start gap-2 text-[12px]">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200/90 font-medium truncate">{line.label}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">{line.detail}</p>
                    </div>
                    <span className={`shrink-0 font-medium tabular-nums text-[12px] ${
                      line.amount !== null ? "text-white" : "text-slate-400 italic"
                    }`}>
                      {line.amount !== null
                        ? `$${line.amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </span>
                  </div>
                  {i < breakdown.lines.length - 1 && <div className="mt-2 h-px bg-white/5" />}
                </div>
              ))}
            </div>

            <div className="h-px bg-white/15" />

            <div className="rounded-xl bg-emerald-950/60 border border-emerald-700/40 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400/80">
                  Total estimado
                </p>
                {breakdown.hasQuote && (
                  <p className="text-[10px] text-amber-400/80 mt-0.5">
                    + acabados por cotizar
                  </p>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[28px] font-bold text-emerald-400 tabular-nums leading-none">
                  ${breakdown.total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {breakdown.hasQuote && (
                  <span className="text-[14px] font-normal text-slate-400">+</span>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-500">
              * Estimación orientativa basada en la lista de precios 2026. El total se confirma antes de imprimir.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
