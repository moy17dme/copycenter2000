import { useEffect, useMemo } from "react";
import { usePriceCalculator } from "../../../hooks/usePriceCalculator";
import { useInkCoverage } from "../../../hooks/useInkCoverage";
import { useCart } from "../../CartContext";
import { cadBulkDiscountPct, cadNextTier, totalCadBondQty } from "../../../utils/cadDiscount";

const MAX_WIDTH_CM = 91;
const SUBSTRATE_HAS_WIDTH_LIMIT = new Set(["Bond", "Opalina", "Fotográfico", "Canvas"]);

const SATURATION_LABELS = {
  "0-10":   "0 – 12%  (CAD / Solo líneas)",
  "11-25":  "13 – 25%",
  "26-40":  "26 – 40%",
  "41-60":  "41 – 60%",
  "61-80":  "61 – 80%",
  "81-100": "81 – 100%  (rellenos / fotos)",
};

const SUBSTRATES = ["Bond", "Opalina", "Fotográfico", "Canvas", "Lona", "Vinil"];

// ── helpers ───────────────────────────────────────────────────────────────

function widthToCm(value, unit) {
  const v = parseFloat(value);
  if (!v || v <= 0) return null;
  return unit === "m" ? v * 100 : v;
}

function calcNumPages(printMode, printPage, printFrom, printTo, totalPages) {
  if (!totalPages || totalPages <= 1) return 1;
  if (printMode === "page") return 1;
  if (printMode === "range") {
    const f = Math.max(1, Math.min(totalPages, parseInt(printFrom) || 1));
    const t = Math.max(f,   Math.min(totalPages, parseInt(printTo)   || totalPages));
    return t - f + 1;
  }
  return totalPages;
}

// Convierte spec como "3", "5-7", "1,3,5-7" en un Set de números de página
function parsePageSpec(spec, maxPage) {
  if (!spec || !maxPage) return new Set();
  const set = new Set();
  for (const token of spec.split(",").map(t => t.trim()).filter(Boolean)) {
    if (/^\d+$/.test(token)) {
      const n = parseInt(token);
      if (n >= 1 && n <= maxPage) set.add(n);
    } else if (/^\d+-\d+$/.test(token)) {
      const [a, b] = token.split("-").map(Number);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
        if (i >= 1 && i <= maxPage) set.add(i);
      }
    }
  }
  return set;
}

// Devuelve el conjunto de páginas que se van a imprimir según el modo
function getSelectedPageSet(printMode, printPage, printFrom, printTo, totalPages) {
  if (!totalPages) return new Set();
  const set = new Set();
  if (printMode === "page") {
    set.add(Math.max(1, Math.min(totalPages, parseInt(printPage) || 1)));
  } else if (printMode === "range") {
    const f = Math.max(1, parseInt(printFrom) || 1);
    const t = Math.min(totalPages, parseInt(printTo)  || totalPages);
    for (let i = f; i <= t; i++) set.add(i);
  } else {
    for (let i = 1; i <= totalPages; i++) set.add(i);
  }
  return set;
}

// ── componente principal ──────────────────────────────────────────────────

export default function PloteoOptionsEditor({ opts, onChangeOptions, item }) {
  const update = (patch) => onChangeOptions({ ...patch });

  // Dimensiones
  const width      = opts.plotWidth      ?? "";
  const height     = opts.plotHeight     ?? "";
  const unit       = opts.plotUnit       ?? "cm";
  const substrate  = opts.plotSubstrate  ?? "Bond";
  const mode       = opts.plotMode       ?? "color";
  const saturation = opts.plotSaturation ?? "0-10";
  const quantity   = opts.plotQuantity   ?? 1;
  const fotoFinish = opts.plotFotoFinish ?? "Brillante";

  // Páginas
  const totalPages = item?.pageCount || 1;
  const printMode  = opts.plotPrintMode ?? "all";
  const printPage  = opts.plotPrintPage ?? 1;
  const printFrom  = opts.plotPrintFrom ?? 1;
  const printTo    = opts.plotPrintTo   ?? totalPages;
  const numPages   = calcNumPages(printMode, printPage, printFrom, printTo, totalPages);

  // Excepción de sustrato
  const exceptEnabled   = opts.plotExceptEnabled   ?? false;
  const exceptSpec      = opts.plotExceptSpec      ?? "";
  const exceptSubstrate = opts.plotExceptSubstrate ?? "Fotográfico";
  const exceptFinish    = opts.plotExceptFinish    ?? "Brillante";
  const exceptMode      = mode; // usa el mismo modo de impresión

  // Páginas de excepción que caen dentro del rango impreso
  const selectedPageSet = useMemo(
    () => getSelectedPageSet(printMode, printPage, printFrom, printTo, totalPages),
    [printMode, printPage, printFrom, printTo, totalPages]
  );
  const exceptPageSet = useMemo(
    () => (exceptEnabled ? parsePageSpec(exceptSpec, totalPages) : new Set()),
    [exceptEnabled, exceptSpec, totalPages]
  );
  const exceptPagesInPrint = useMemo(
    () => [...exceptPageSet].filter(p => selectedPageSet.has(p)).sort((a, b) => a - b),
    [exceptPageSet, selectedPageSet]
  );
  const mainPagesCount   = numPages - exceptPagesInPrint.length;
  const exceptPagesCount = exceptPagesInPrint.length;

  // ── Ink coverage ─────────────────────────────────────────
  const ink = useInkCoverage(item);
  const cadOverride = opts.plotCadOverride ?? false;

  useEffect(() => {
    const inkPatch = {
      plotCoveragePct: ink.coveragePct ?? null,
      plotCadLike: Boolean(ink.cadLike),
      plotSaturationAuto: ink.saturationRange ?? null,
    };

    if (cadOverride) {
      // Manual override: force CAD tier regardless of auto-detection
      update({ ...inkPatch, plotSaturation: "0-10" });
    } else if (ink.saturationRange) {
      update({ ...inkPatch, plotSaturation: ink.saturationRange });
    } else if (ink.coveragePct != null || ink.cadLike != null) {
      update(inkPatch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ink.coveragePct, ink.saturationRange, ink.cadLike, cadOverride]);

  // ── Validación de ancho ───────────────────────────────────
  const widthCm       = widthToCm(width, unit);
  const hasWidthLimit = SUBSTRATE_HAS_WIDTH_LIMIT.has(substrate);
  const widthExceeded = hasWidthLimit && widthCm !== null && widthCm > MAX_WIDTH_CM;

  const exceptHasWidthLimit = SUBSTRATE_HAS_WIDTH_LIMIT.has(exceptSubstrate);
  const exceptWidthExceeded = exceptHasWidthLimit && widthCm !== null && widthCm > MAX_WIDTH_CM;

  // ── Calculadoras de precio ────────────────────────────────
  // calc principal: quantity=1 para obtener precio por página
  const calcMain = usePriceCalculator({
    width, height, unit,
    substrate, mode, saturation,
    quantity: 1,
    coveragePct: ink.coveragePct ?? null,
  });

  // calc excepción: mismas dimensiones, sustrato diferente, quantity=1
  const calcExcept = usePriceCalculator({
    width, height, unit,
    substrate: exceptSubstrate,
    mode: exceptMode,
    saturation: "0-10",   // saturación no afecta sustratos no-Bond
    quantity: 1,
    coveragePct: null,
  });

  // ── Totales combinados ────────────────────────────────────
  const mainTotal   = calcMain.valid
    ? parseFloat((calcMain.subtotal   * mainPagesCount   * quantity).toFixed(2)) : null;
  const exceptTotal = (calcExcept.valid && exceptPagesCount > 0 && exceptEnabled)
    ? parseFloat((calcExcept.subtotal * exceptPagesCount * quantity).toFixed(2)) : null;
  const grandTotal  = (mainTotal != null)
    ? parseFloat(((mainTotal ?? 0) + (exceptTotal ?? 0)).toFixed(2)) : null;

  // ── CAD discount (sobre páginas del sustrato principal) ───
  const { items: cartItems } = useCart();
  const cadTotalQty    = useMemo(() => totalCadBondQty(cartItems), [cartItems]);
  const discountPct    = substrate === "Bond" && saturation === "0-10"
    ? cadBulkDiscountPct(cadTotalQty) : 0;
  const nextTier       = substrate === "Bond" && saturation === "0-10"
    ? cadNextTier(cadTotalQty) : null;
  const discountedMain = discountPct > 0 && mainTotal != null
    ? parseFloat((mainTotal * (1 - discountPct / 100)).toFixed(2)) : null;
  const discountedGrand = discountedMain != null
    ? parseFloat((discountedMain + (exceptTotal ?? 0)).toFixed(2)) : null;

  const isBond = substrate === "Bond";
  const isLona = substrate === "Lona";
  const isFoto = substrate === "Fotográfico";
  const isExceptFoto = exceptSubstrate === "Fotográfico";

  const handleDimension = (field) => (e) => {
    const v = e.target.value;
    if (v === "" || parseFloat(v) > 0) update({ [field]: v });
  };

  const calcValid = calcMain.valid && !widthExceeded;

  // ── Panel de saturación ───────────────────────────────────
  const SaturationPanel = () => {
    if (!isBond) return null;
    return (
      <>
        <div className="h-px bg-white/10" />
        <section>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-2 block">
            Nivel de saturación de color de su archivo
          </label>

          {ink.analyzing && (
            <div className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "rgba(31,74,168,0.1)", border: "1px solid rgba(31,74,168,0.25)" }}>
              <span className="w-4 h-4 shrink-0 border-2 border-current border-t-transparent rounded-full animate-spin"
                style={{ color: "#7EB3FF" }} />
              <div>
                <p className="text-[12px] font-medium" style={{ color: "#7EB3FF" }}>Analizando archivo…</p>
                {ink.progress && (
                  <p className="text-[11px] mt-0.5" style={{ color: "#4E7BDA" }}>
                    Página {ink.progress.done} de {ink.progress.total}
                    {ink.progress.total < (item?.pageCount || 1) ? ` (muestra de ${ink.progress.total})` : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {!ink.analyzing && (ink.error || (!ink.supported && item)) && (
            <div className="rounded-xl p-3"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <p className="text-[12px]" style={{ color: "#FCD34D" }}>
                No fue posible detectar la saturación automáticamente para este formato.
              </p>
              <p className="text-[11px] mt-0.5 text-slate-400">
                El costo de Bond se estimará en el rango actual ({SATURATION_LABELS[saturation]}).
              </p>
            </div>
          )}

          {!ink.analyzing && ink.saturationRange && !ink.error && (
            <div className="rounded-xl p-3 space-y-2"
              style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "#6EE7B7" }}>
                    {cadOverride ? SATURATION_LABELS["0-10"] : SATURATION_LABELS[ink.saturationRange]}
                  </p>
                  <p className="text-[11px] mt-0.5 text-slate-400">
                    Promedio: {ink.coveragePct?.toFixed(1)}% de cobertura
                    {ink.nonWhiteFraction != null
                      ? ` · ${(ink.nonWhiteFraction * 100).toFixed(1)}% píx. no-blancos`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(16,185,129,0.15)", color: "#6EE7B7", border: "1px solid rgba(16,185,129,0.25)" }}>
                    {cadOverride ? "Manual" : "Auto-detectado"}
                  </span>
                  {(ink.cadLike || cadOverride) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(99,102,241,0.15)", color: "#A5B4FC", border: "1px solid rgba(99,102,241,0.3)" }}>
                      CAD / Líneas puras
                    </span>
                  )}
                </div>
              </div>

              {(ink.cadLike || cadOverride) && (saturation === "0-10") && (ink.coveragePct ?? 0) > 12 && (
                <div className="rounded-lg px-3 py-2 text-[11px]"
                  style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <p style={{ color: "#A5B4FC" }}>
                    Tu archivo mide {ink.coveragePct?.toFixed(1)}% de cobertura, pero se detectó que es un
                    plano de <strong>solo líneas / CAD</strong>. Se aplica precio CAD.
                  </p>
                </div>
              )}

              {ink.variesAcrossPages && (
                <div className="pt-1 border-t border-white/10">
                  <p className="text-[11px] text-amber-300/80">
                    Las páginas varían entre {ink.minCoverage?.toFixed(1)}% y {ink.maxCoverage?.toFixed(1)}%.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Se usó el promedio ({ink.coveragePct?.toFixed(1)}%) para calcular el precio.
                    {ink.sampledPages < ink.numPages
                      ? ` (Muestra de ${ink.sampledPages} de ${ink.numPages} páginas.)`
                      : ` (${ink.numPages} páginas analizadas.)`}
                  </p>
                  {ink.pages && ink.pages.length > 1 && ink.pages.length <= 12 && (
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      {ink.pages.map(({ pageNum, coveragePct }) => (
                        <div key={pageNum} className="rounded px-1.5 py-1 flex items-center justify-between gap-1"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <span className="text-[10px] text-slate-400">Pág {pageNum}</span>
                          <span className="text-[10px] font-medium tabular-nums"
                            style={{ color: coveragePct > 60 ? "#FCA5A5" : coveragePct > 40 ? "#FCD34D" : "#6EE7B7" }}>
                            {coveragePct.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!ink.variesAcrossPages && ink.numPages > 1 && (
                <p className="text-[11px] text-slate-400 pt-1 border-t border-white/10">
                  Saturación uniforme en las {ink.numPages} páginas.
                  {ink.sampledPages < ink.numPages ? ` (Muestra de ${ink.sampledPages} páginas.)` : ""}
                </p>
              )}
            </div>
          )}

          {/* Toggle de override manual CAD */}
          {isBond && !ink.analyzing && (
            <label className="flex items-center gap-2 cursor-pointer select-none mt-2">
              <input
                type="checkbox"
                checked={cadOverride}
                onChange={(e) => update({ plotCadOverride: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-indigo-500"
              />
              <span className="text-[11px] text-slate-400">
                Forzar precio CAD / Solo líneas
                {!ink.cadLike && cadOverride
                  ? " (activo manualmente)"
                  : !ink.cadLike && !cadOverride
                  ? " — activar si la detección automática falló"
                  : ""}
              </span>
            </label>
          )}
        </section>
      </>
    );
  };

  // ── Panel de páginas ──────────────────────────────────────
  const PageRangeSelector = () => {
    if (totalPages <= 1) return null;
    const clampPage = (v, fallback) => {
      const n = parseInt(v);
      return isNaN(n) ? fallback : Math.max(1, Math.min(totalPages, n));
    };
    return (
      <>
        <div className="h-px bg-white/10" />
        <section>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-2 block">
            Páginas a imprimir
          </label>
          <div className="chips flex flex-wrap gap-2 mb-3">
            <button type="button"
              className={`chip text-[11px] py-1.5 ${printMode === "all" ? "chip-active" : ""}`}
              onClick={() => update({ plotPrintMode: "all" })}>
              Todas ({totalPages})
            </button>
            <button type="button"
              className={`chip text-[11px] py-1.5 ${printMode === "page" ? "chip-active" : ""}`}
              onClick={() => update({ plotPrintMode: "page", plotPrintPage: printPage || 1 })}>
              Página específica
            </button>
            <button type="button"
              className={`chip text-[11px] py-1.5 ${printMode === "range" ? "chip-active" : ""}`}
              onClick={() => update({ plotPrintMode: "range", plotPrintFrom: printFrom || 1, plotPrintTo: printTo || totalPages })}>
              Rango
            </button>
          </div>
          {printMode === "page" && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400 shrink-0">Página:</label>
              <input type="number" min={1} max={totalPages}
                className="input h-8 py-1 text-[13px] w-24"
                value={printPage}
                onChange={(e) => update({ plotPrintPage: clampPage(e.target.value, 1) })} />
              <span className="text-[11px] text-slate-500">de {totalPages}</span>
            </div>
          )}
          {printMode === "range" && (
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-[11px] text-slate-400 shrink-0">De:</label>
              <input type="number" min={1} max={totalPages}
                className="input h-8 py-1 text-[13px] w-20"
                value={printFrom}
                onChange={(e) => {
                  const f = clampPage(e.target.value, 1);
                  update({ plotPrintFrom: f, plotPrintTo: Math.max(f, printTo || totalPages) });
                }} />
              <label className="text-[11px] text-slate-400 shrink-0">a:</label>
              <input type="number" min={printFrom || 1} max={totalPages}
                className="input h-8 py-1 text-[13px] w-20"
                value={printTo}
                onChange={(e) => update({ plotPrintTo: Math.max(printFrom || 1, clampPage(e.target.value, totalPages)) })} />
              <span className="text-[11px] text-slate-500">de {totalPages}</span>
            </div>
          )}
          <p className="mt-2 text-[11px]" style={{ color: "#9AA6B2" }}>
            {printMode === "all"
              ? `Se imprimirán las ${totalPages} páginas.`
              : printMode === "page"
              ? `Se imprimirá solo la página ${printPage}.`
              : `Se imprimirán las páginas ${printFrom} a ${printTo} (${numPages} pág${numPages !== 1 ? "s" : ""}).`}
          </p>
        </section>
      </>
    );
  };

  // ── Panel de excepción de sustrato ────────────────────────
  const SubstrateExceptionPanel = () => (
    <>
      <div className="h-px bg-white/10" />
      <section>
        {/* Toggle de activación */}
        <label className="flex items-center gap-2 cursor-pointer select-none mb-3">
          <input
            type="checkbox"
            checked={exceptEnabled}
            onChange={(e) => update({ plotExceptEnabled: e.target.checked })}
            className="w-4 h-4 rounded accent-indigo-500"
          />
          <span className="text-[12px] text-slate-200">
            Algunas páginas en sustrato diferente
          </span>
        </label>

        {exceptEnabled && (
          <div className="rounded-xl p-3 space-y-4"
            style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.25)" }}>

            {/* Especificación de páginas */}
            <div>
              <label className="text-[11px] text-slate-300/80 mb-1 block">
                ¿Qué páginas van en el otro sustrato?
              </label>
              <input
                type="text"
                className="input h-8 py-1 text-[13px] w-full"
                placeholder={`Ej: 3  ó  5-7  ó  1,3,5-7  (máx. pág. ${totalPages})`}
                value={exceptSpec}
                onChange={(e) => update({ plotExceptSpec: e.target.value })}
              />
              {/* Resumen de páginas parseadas */}
              {exceptSpec && (
                <div className="mt-1.5">
                  {exceptPagesInPrint.length > 0 ? (
                    <p className="text-[11px]" style={{ color: "#A5B4FC" }}>
                      {exceptPagesInPrint.length === 1
                        ? `Página ${exceptPagesInPrint[0]} → ${exceptSubstrate}`
                        : `${exceptPagesInPrint.length} páginas → ${exceptSubstrate}: ${
                            exceptPagesInPrint.slice(0, 6).join(", ")}${exceptPagesInPrint.length > 6 ? "…" : ""}`}
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-400/80">
                      Ninguna de esas páginas está en el rango a imprimir.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Sustrato de excepción */}
            <div>
              <label className="text-[11px] text-slate-300/80 mb-1.5 block">
                Sustrato para esas páginas
              </label>
              <div className="chips flex flex-wrap gap-1.5">
                {SUBSTRATES.filter(s => s !== substrate).map(s => (
                  <button key={s} type="button"
                    className={`chip text-[11px] py-1 ${exceptSubstrate === s ? "chip-active" : ""}`}
                    onClick={() => update({ plotExceptSubstrate: s })}>
                    {s}
                  </button>
                ))}
              </div>
              {exceptHasWidthLimit && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Ancho máximo: {MAX_WIDTH_CM} cm para {exceptSubstrate}.
                  {exceptWidthExceeded && (
                    <span className="text-red-400 ml-1">
                      ¡El ancho actual excede el límite!
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Acabado fotográfico de excepción */}
            {isExceptFoto && (
              <div>
                <label className="text-[11px] text-slate-300/80 mb-1.5 block">
                  Acabado de {exceptSubstrate}
                </label>
                <div className="chips flex gap-1.5">
                  {["Brillante", "Satinado", "Mate"].map(f => (
                    <button key={f} type="button"
                      className={`chip text-[11px] py-1 ${exceptFinish === f ? "chip-active" : ""}`}
                      onClick={() => update({ plotExceptFinish: f })}>
                      {f}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Los tres acabados tienen el mismo precio.
                </p>
              </div>
            )}

            {/* Mini resumen de distribución */}
            {calcMain.valid && exceptPagesInPrint.length > 0 && (
              <div className="rounded-lg px-3 py-2 space-y-0.5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[11px] text-slate-300">
                  <span style={{ color: "#6EE7B7" }}>●</span>{" "}
                  {mainPagesCount} pág{mainPagesCount !== 1 ? "s" : ""} en <strong>{substrate}</strong>
                  {discountPct > 0 ? ` (−${discountPct}% desc. CAD)` : ""}
                </p>
                <p className="text-[11px] text-slate-300">
                  <span style={{ color: "#A5B4FC" }}>●</span>{" "}
                  {exceptPagesInPrint.length} pág{exceptPagesInPrint.length !== 1 ? "s" : ""} en <strong>{exceptSubstrate}</strong>
                  {isExceptFoto ? ` (${exceptFinish})` : ""}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );

  return (
    <div className="space-y-5 text-[13px] leading-snug">

      {/* ── Dimensiones ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80">
            Dimensiones
          </label>
          <div className="chips flex gap-1">
            <button type="button"
              className={`chip text-[11px] py-1 px-2.5 ${unit === "cm" ? "chip-active" : ""}`}
              onClick={() => update({ plotUnit: "cm" })}>cm</button>
            <button type="button"
              className={`chip text-[11px] py-1 px-2.5 ${unit === "m" ? "chip-active" : ""}`}
              onClick={() => update({ plotUnit: "m" })}>m</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-400 mb-0.5 block">Ancho ({unit})</label>
            <input type="number" min={0.01} step="any"
              className={`input h-9 py-1.5 text-[13px] ${widthExceeded ? "border-red-500/60" : ""}`}
              placeholder={unit === "cm" ? "Ej. 90" : "Ej. 0.90"}
              value={width} onChange={handleDimension("plotWidth")} />
            {hasWidthLimit && !widthExceeded && widthCm && (
              <p className="mt-0.5 text-[10px] text-slate-500">Máx. {MAX_WIDTH_CM} cm para {substrate}</p>
            )}
            {widthExceeded && (
              <p className="mt-0.5 text-[10px] text-red-400">
                El ancho máximo para {substrate} es {MAX_WIDTH_CM} cm
                {unit === "m" ? ` (${(MAX_WIDTH_CM / 100).toFixed(2)} m)` : ""}.
                Considera Lona / Vinil para formatos más anchos.
              </p>
            )}
          </div>
          <div>
            <label className="text-[11px] text-slate-400 mb-0.5 block">Largo ({unit})</label>
            <input type="number" min={0.01} step="any"
              className="input h-9 py-1.5 text-[13px]"
              placeholder={unit === "cm" ? "Ej. 120" : "Ej. 1.20"}
              value={height} onChange={handleDimension("plotHeight")} />
          </div>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          {isLona
            ? "Lona: se cobra por m² (Ancho × Largo)."
            : "El resto de materiales: se cobra por metro lineal (Largo del archivo)."}
        </p>
      </section>

      <div className="h-px bg-white/10" />

      {/* ── Sustrato principal ───────────────────────────────── */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Tipo de sustrato
        </label>
        <div className="chips flex flex-wrap gap-2">
          {SUBSTRATES.map(s => (
            <button key={s} type="button"
              className={`chip text-[11px] py-1.5 ${substrate === s ? "chip-active" : ""}`}
              onClick={() => update({ plotSubstrate: s })}>
              {s}
            </button>
          ))}
        </div>
        {hasWidthLimit && (
          <p className="mt-1 text-[11px] text-slate-400">
            Ancho máximo de impresión: {MAX_WIDTH_CM} cm. Largo libre.
          </p>
        )}
      </section>

      {/* ── Acabado fotográfico ──────────────────────────────── */}
      {isFoto && (
        <>
          <div className="h-px bg-white/10" />
          <section>
            <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
              Tipo de papel fotográfico
            </label>
            <div className="chips flex flex-wrap gap-2">
              {["Brillante", "Satinado", "Mate"].map(finish => (
                <button key={finish} type="button"
                  className={`chip text-[11px] py-1.5 ${fotoFinish === finish ? "chip-active" : ""}`}
                  onClick={() => update({ plotFotoFinish: finish })}>
                  {finish}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Los tres acabados tienen el mismo precio.
            </p>
          </section>
        </>
      )}

      <div className="h-px bg-white/10" />

      {/* ── Modo de impresión ────────────────────────────────── */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Modo de impresión
        </label>
        <div className="chips">
          <button type="button"
            className={`chip text-[11px] py-1.5 ${mode === "color" ? "chip-active" : ""}`}
            onClick={() => update({ plotMode: "color" })}>Color</button>
          <button type="button"
            className={`chip text-[11px] py-1.5 ${mode === "bn" ? "chip-active" : ""}`}
            onClick={() => update({ plotMode: "bn" })}>Blanco y negro</button>
        </div>
        {!isBond && (
          <p className="mt-1 text-[11px] text-slate-400">
            El precio de este sustrato no varía por modo de impresión.
          </p>
        )}
      </section>

      {/* ── Saturación ───────────────────────────────────────── */}
      <SaturationPanel />

      <div className="h-px bg-white/10" />

      {/* ── Cantidad ─────────────────────────────────────────── */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Cantidad (copias)
        </label>
        <input type="number" min={1}
          className="input h-9 py-1.5 text-[13px] w-32"
          value={quantity}
          onChange={(e) => update({ plotQuantity: Math.max(1, parseInt(e.target.value) || 1) })} />
      </section>

      {/* ── Páginas a imprimir ───────────────────────────────── */}
      <PageRangeSelector />

      {/* ── Excepción de sustrato ────────────────────────────── */}
      <SubstrateExceptionPanel />

      {/* ── Error de medidas ─────────────────────────────────── */}
      {!calcMain.valid && (width !== "" || height !== "") && !widthExceeded && (
        <p className="text-[11px] text-amber-400/80">
          Ingresa medidas válidas (mayores a cero) para calcular el precio.
        </p>
      )}

      {/* ── Desglose de precio ───────────────────────────────── */}
      {calcValid && (
        <>
          <div className="h-px bg-white/10" />
          <div className="card card--glass-dark p-4 space-y-2">
            <h5 className="text-[11px] font-semibold text-white/90 uppercase tracking-[0.18em]">
              Desglose de precio
            </h5>

            <div className="space-y-1.5 text-[12px] text-slate-300/90">

              {/* ── Bloque sustrato principal ──────────────────── */}
              <div className="flex justify-between">
                <span>
                  Precio/{calcMain.isPerM2 ? "m²" : "ml"} · {substrate}
                  {isBond && ink.saturationRange ? ` (${ink.saturationRange}%)` : ""}
                </span>
                <span className="font-medium text-white tabular-nums">
                  ${calcMain.unitPrice.toLocaleString("es-MX")}
                </span>
              </div>

              <div className="flex justify-between text-slate-300/60">
                <span>{calcMain.isPerM2 ? "Área" : "Metros lineales"}</span>
                <span className="tabular-nums">
                  {calcMain.dimension.toFixed(4)} {calcMain.isPerM2 ? "m²" : "ml"}
                </span>
              </div>

              {exceptEnabled && exceptPagesInPrint.length > 0 && (
                <div className="flex justify-between text-slate-300/60">
                  <span>Páginas en {substrate}</span>
                  <span className="tabular-nums">× {mainPagesCount} pág</span>
                </div>
              )}

              {!(exceptEnabled && exceptPagesInPrint.length > 0) && numPages > 1 && (
                <div className="flex justify-between text-slate-300/60">
                  <span>Páginas</span>
                  <span className="tabular-nums">× {numPages} pág</span>
                </div>
              )}

              {/* Saturación detectada */}
              {isBond && ink.saturationRange && (
                <>
                  <div className="flex justify-between text-slate-300/60">
                    <span>Saturación detectada</span>
                    <span className="tabular-nums font-semibold" style={{ color: "#6EE7B7" }}>
                      {ink.coveragePct?.toFixed(1)}%
                      {ink.cadLike && <span className="ml-1 text-[10px]" style={{ color: "#A5B4FC" }}>(CAD)</span>}
                    </span>
                  </div>
                  {calcMain.interpolated && calcMain.rangePrice !== null && calcMain.rangePrice !== calcMain.unitPrice && (
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Precio máx. del rango</span>
                      <span className="tabular-nums line-through">
                        ${calcMain.rangePrice.toLocaleString("es-MX")}/ml
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* ── Bloque sustrato excepción ───────────────────── */}
              {exceptEnabled && exceptPagesInPrint.length > 0 && calcExcept.valid && (
                <>
                  <div className="h-px bg-white/10 my-1" />
                  <div className="flex justify-between" style={{ color: "#C4B5FD" }}>
                    <span>
                      Precio/{calcExcept.isPerM2 ? "m²" : "ml"} · {exceptSubstrate}
                      {isExceptFoto ? ` (${exceptFinish})` : ""}
                    </span>
                    <span className="font-medium tabular-nums">
                      ${calcExcept.unitPrice.toLocaleString("es-MX")}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300/60">
                    <span>Páginas en {exceptSubstrate}</span>
                    <span className="tabular-nums">× {exceptPagesInPrint.length} pág</span>
                  </div>
                  {exceptWidthExceeded && (
                    <p className="text-[11px] text-red-400">
                      El ancho excede el máximo de {exceptSubstrate} ({MAX_WIDTH_CM} cm).
                    </p>
                  )}
                </>
              )}

              {/* Copias */}
              <div className="flex justify-between">
                <span>Copias</span>
                <span className="font-medium text-white tabular-nums">× {quantity}</span>
              </div>

              {/* Total de hojas */}
              {(numPages > 1 || quantity > 1) && (
                <div className="flex justify-between text-slate-300/60 text-[11px]">
                  <span>Total de hojas</span>
                  <span className="tabular-nums">{numPages * quantity}</span>
                </div>
              )}

              {isFoto && (
                <div className="flex justify-between text-slate-300/60">
                  <span>Acabado fotográfico</span>
                  <span className="tabular-nums">{fotoFinish}</span>
                </div>
              )}
            </div>

            <div className="h-px bg-white/10 mt-1" />

            {/* ── Descuento CAD + totales ─────────────────────── */}
            {discountPct > 0 ? (
              <div className="space-y-1.5">
                <div className="rounded-lg px-3 py-2 flex items-center gap-2"
                  style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)" }}>
                  <span className="text-base">🎉</span>
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: "#FDE047" }}>
                      ¡Descuento por volumen del {discountPct}%!
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#CA8A04" }}>
                      Tienes {cadTotalQty} planos CAD/Bond en tu carrito.
                    </p>
                  </div>
                </div>

                <div className="text-[12px] space-y-1 text-slate-300/90">
                  {exceptTotal != null && exceptTotal > 0 && (
                    <div className="flex justify-between text-slate-300/60">
                      <span>Subtotal {exceptSubstrate} ({exceptPagesInPrint.length} pág × {quantity} cop.)</span>
                      <span className="tabular-nums">${exceptTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Subtotal {substrate} antes del descuento</span>
                    <span className="tabular-nums line-through text-slate-400">
                      ${mainTotal?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between" style={{ color: "#FDE047" }}>
                    <span>Descuento {discountPct}% (CAD volumen)</span>
                    <span className="tabular-nums font-medium">
                      −${((mainTotal ?? 0) - (discountedMain ?? 0)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-white/10" />
                <div className="flex justify-between text-[14px] font-semibold">
                  <span className="text-white/90">Total estimado</span>
                  <span className="tabular-nums" style={{ color: "#34D399" }}>
                    ${discountedGrand?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {nextTier && (
                  <p className="text-[10px] mt-0.5" style={{ color: "#6EE7B7" }}>
                    Agrega {nextTier.needed} planos más para subir al {nextTier.pct}% de descuento.
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Sin descuento: mostrar desglose cuando hay excepción */}
                {exceptEnabled && exceptTotal != null && exceptTotal > 0 && (
                  <div className="text-[12px] space-y-1 text-slate-300/60 mb-1">
                    <div className="flex justify-between">
                      <span>Subtotal {substrate} ({mainPagesCount} pág × {quantity} cop.)</span>
                      <span className="tabular-nums">${mainTotal?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between" style={{ color: "#C4B5FD" }}>
                      <span>Subtotal {exceptSubstrate} ({exceptPagesInPrint.length} pág × {quantity} cop.)</span>
                      <span className="tabular-nums">${exceptTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-[14px] font-semibold">
                  <span className="text-white/90">Total estimado</span>
                  <span className="text-emerald-400 tabular-nums">
                    ${grandTotal?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {isBond && saturation === "0-10" && nextTier && (
                  <p className="text-[10px] mt-0.5" style={{ color: "#9AA6B2" }}>
                    Agrega {nextTier.needed} plano{nextTier.needed !== 1 ? "s" : ""} CAD más al carrito
                    y obtén un {nextTier.pct}% de descuento en todos tus planos CAD/Bond.
                  </p>
                )}
              </>
            )}

            <p className="text-[10px] text-slate-400 mt-1">
              * Estimación orientativa. El costo final puede ajustarse según el archivo.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
