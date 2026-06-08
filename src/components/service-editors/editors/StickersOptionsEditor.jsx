import { useMemo, useState, useRef, useEffect } from "react";

// ── Precios de materiales (por metro lineal, rollo de 50 cm de ancho) ──
const PRECIO_MATERIAL = {
  "vinil-mate":         200,
  "vinil-brillante":    250,
  "vinil-transparente": 400,
};
const LABEL_MATERIAL = {
  "vinil-mate":         "Vinil mate",
  "vinil-brillante":    "Vinil brillante",
  "vinil-transparente": "Vinil transparente",
};

// ── Hoja de vinil mate ────────────────────────────────────────────────────────
const HOJA_ANCHO_CM   = 28;   // ancho físico de la hoja (cm)
const HOJA_LARGO_CM   = 43;   // largo físico de la hoja (cm)
const HOJA_MARGEN_CM  = 5;    // margen por cada lado
const HOJA_USABLE_W   = HOJA_ANCHO_CM - HOJA_MARGEN_CM * 2; // 18 cm
const HOJA_USABLE_H   = HOJA_LARGO_CM - HOJA_MARGEN_CM * 2; // 33 cm
const HOJA_PRECIO     = 28;   // $ por hoja

function calcPrecioHoja({ widthCm, heightCm, qty, cutType }) {
  if (!widthCm || !heightCm || !qty || widthCm <= 0 || heightCm <= 0 || qty <= 0) return null;

  const wEfectivo = widthCm  + 0.2 * 2;
  const hEfectivo = heightCm + 0.2 * 2;

  const xPorHoja = Math.floor(HOJA_USABLE_W / wEfectivo);
  const yPorHoja = Math.floor(HOJA_USABLE_H / hEfectivo);

  if (xPorHoja === 0 || yPorHoja === 0) return null; // no cabe → no ofrecer hoja

  const porHoja        = xPorHoja * yPorHoja;
  const hojas          = Math.ceil(qty / porHoja);
  const precioVinil    = hojas * HOJA_PRECIO;
  const precioPorCorte = cutType === "individual" ? 0.50 : 0.40;
  const precioCorte    = qty * precioPorCorte;
  const total          = precioVinil + precioCorte;

  return { xPorHoja, yPorHoja, porHoja, hojas, precioVinil, precioPorCorte, precioCorte, total };
}

// ── Dimensiones del equipo ────────────────────────────────────────────────────
const PLOTTER_ANCHO_CM  = 50;   // ancho usable para stickers (cm)
const ROLLO_ANCHO_CM    = 150;  // ancho del rollo de vinil → 3 tiras de 50 cm
const USABLE_LARGO_CM   = 140;  // alto usable para stickers por tira (cm)
const GRIP_CM           = 10;   // cm de agarre que necesita el plotter al inicio
const MARGEN_STK_CM     = 0.2;  // 2 mm de margen por cada lado entre stickers
const MIN_LARGO_CM      = 60;   // mínimo de largo que siempre se cobra (cm)
const TIRA_TOTAL_CM     = USABLE_LARGO_CM + GRIP_CM; // 150 cm — largo cobrado por tira de laminado

// Tiras de 50 cm que salen del rollo de 150 cm (se imprimen juntas)
const TIRAS_POR_ROLLO = Math.floor(ROLLO_ANCHO_CM / PLOTTER_ANCHO_CM); // 3

// ── Precios de laminado ($/metro lineal de tira) ──────────────────────────────
const LAMINADO_M = {
  brillante: 60,   // → $90 por tira de 150 cm
  mate:      107,  // → $160 por tira de 150 cm
};

function calcPrecioStickers({ widthCm, heightCm, qty, material, cutType, laminadoTipo }) {
  if (!widthCm || !heightCm || !qty || widthCm <= 0 || heightCm <= 0 || qty <= 0) return null;
  if (widthCm > PLOTTER_ANCHO_CM)
    return { error: `El ancho (${widthCm} cm) supera los ${PLOTTER_ANCHO_CM} cm del plotter.` };

  const wEfectivo = widthCm  + MARGEN_STK_CM * 2;
  const hEfectivo = heightCm + MARGEN_STK_CM * 2;

  // ── Capacidad por tira (50 × 140 cm usables) ──────────────────────────────
  const xPorTira = Math.floor(PLOTTER_ANCHO_CM / wEfectivo);
  const yPorTira = Math.floor(USABLE_LARGO_CM  / hEfectivo);

  if (xPorTira === 0 || yPorTira === 0)
    return { error: `El sticker (${widthCm}×${heightCm} cm) no cabe en el área usable de ${PLOTTER_ANCHO_CM}×${USABLE_LARGO_CM} cm.` };

  const porTira    = xPorTira * yPorTira;
  const tirasCorte = Math.ceil(qty / porTira);

  // ── Consumo de vinil (3 tiras simultáneas del rollo de 150 cm) ────────────
  const porFilaRollo    = xPorTira * TIRAS_POR_ROLLO;
  const filasNecesarias = Math.ceil(qty / porFilaRollo);
  const largoCmReal     = filasNecesarias * hEfectivo + GRIP_CM;
  const largoCmFactura  = Math.max(largoCmReal, MIN_LARGO_CM);
  const metrosLineales  = largoCmFactura / 100;
  const minimoAplicado  = largoCmReal < MIN_LARGO_CM;

  const precioVinil    = metrosLineales * (PRECIO_MATERIAL[material] ?? 200);
  const precioPorCorte = cutType === "individual" ? 0.50 : 0.40;
  const precioCorte    = qty * precioPorCorte;

  // ── Laminado (por tira que pasa por la laminadora, largo fijo 150 cm) ─────
  const precioLaminado = laminadoTipo
    ? tirasCorte * (TIRA_TOTAL_CM / 100) * (LAMINADO_M[laminadoTipo] ?? 0)
    : 0;

  const total = precioVinil + precioCorte + precioLaminado;

  return {
    xPorTira, yPorTira, porTira, tirasCorte,
    porFilaRollo, filasNecesarias,
    largoCmReal, largoCmFactura, minimoAplicado,
    metrosLineales, precioVinil, precioPorCorte, precioCorte,
    precioLaminado, total,
  };
}

// ── Tooltip de imagen ─────────────────────────────────────────────────────────
function CutTooltip() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-4 h-4 rounded-full bg-white/15 hover:bg-white/25 text-[10px] text-slate-300 font-bold leading-none flex items-center justify-center transition">
        ?
      </button>

      {open && (
        <div className="absolute left-0 top-6 z-50 w-64 rounded-2xl border border-white/15 bg-slate-900 shadow-2xl p-3 space-y-3">
          <div>
            <p className="text-[11px] font-semibold text-white mb-1">Corte completo</p>
            <div className="rounded-xl bg-white/5 border border-white/10 p-2 flex items-center justify-center h-20 mb-1">
              {/* Representación visual: stickers separados */}
              <div className="flex gap-2">
                {[0,1,2].map(i => (
                  <div key={i} className="w-10 h-10 rounded border-2 border-orange-400 bg-orange-400/10 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-sm bg-orange-400/40" />
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-400">Cada sticker queda recortado individualmente (troquelado). Listo para despegar y pegar.</p>
          </div>

          <div className="h-px bg-white/10" />

          <div>
            <p className="text-[11px] font-semibold text-white mb-1">Medio corte</p>
            <div className="rounded-xl bg-white/5 border border-white/10 p-2 flex items-center justify-center h-20 mb-1">
              {/* Representación visual: stickers en hoja */}
              <div className="border-2 border-slate-500 rounded p-1 flex gap-1.5 flex-wrap w-full max-w-[120px]">
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} className="w-7 h-7 rounded-sm border border-dashed border-blue-400 bg-blue-400/10" />
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-400">Los stickers vienen en hoja. El corte llega hasta el adhesivo pero no corta el papel de respaldo. Se despegan fácil.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StickersOptionsEditor({ opts, onChangeOptions }) {
  const update = (patch) => onChangeOptions({ ...patch });

  // ====== Básicos ======
  const shape = opts.stkShape || "cuadrado";
  const material = opts.stkMaterial || "vinil-mate";
  const usage = opts.stkUsage || "interior";
  const cutType = opts.stkCutType || "hoja";
  const laminado = !!opts.stkLaminado;

  // ====== Cantidades (select) ======
  const qtyPreset = opts.stkQtyPreset || ""; // "25" | ... | "10000" | "custom"
  const qtyCustom = opts.stkQtyCustom ?? ""; // number cuando custom
  const qtyEffective = useMemo(() => {
    if (qtyPreset && qtyPreset !== "custom") return Number(qtyPreset);
    const n = Number(qtyCustom);
    return Number.isFinite(n) && n > 0 ? n : "";
  }, [qtyPreset, qtyCustom]);

  // ====== Tamaños (select) ======
  // guardamos un preset y, si es custom, width/height
  const sizePreset = opts.stkSizePreset || "10x10"; // "5x5" | "7.5x7.5" | "10x10" | "12.5x12.5" | "custom"
  const width = opts.stkWidthCm ?? "";
  const height = opts.stkHeightCm ?? "";

  const setSizePreset = (v) => {
    update({ stkSizePreset: v });

    // si es preset, rellenamos width/height automáticamente
    if (v !== "custom") {
      const [w, h] = v.split("x").map(Number);
      if (Number.isFinite(w) && Number.isFinite(h)) {
        update({ stkWidthCm: w, stkHeightCm: h });
      }
    }
  };

  // clamp helper
  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

  const handleWidth = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return update({ stkWidthCm: "" });
    update({ stkWidthCm: clamp(n, 1, 150) }); // ✅ máximo 150
  };

  const handleHeight = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return update({ stkHeightCm: "" });
    update({ stkHeightCm: clamp(n, 1, 999) });
  };

  // ====== Laminado ======
  const laminadoTipo = laminado ? (opts.stkLaminadoTipo || "brillante") : null;

  // ====== UI helpers ======
  const isCustomQty = qtyPreset === "custom";
  const isCustomSize = sizePreset === "custom";

  // ====== Precios estimados ======
  const precioTira = useMemo(() => calcPrecioStickers({
    widthCm:  Number(width)  || 0,
    heightCm: Number(height) || 0,
    qty:      qtyEffective   || 0,
    material,
    cutType,
    laminadoTipo,
  }), [width, height, qtyEffective, material, cutType, laminadoTipo]);

  const precioHoja = useMemo(() => calcPrecioHoja({
    widthCm:  Number(width)  || 0,
    heightCm: Number(height) || 0,
    qty:      qtyEffective   || 0,
    cutType,
  }), [width, height, qtyEffective, cutType]);

  // Auto-seleccionar hoja cuando sea más barato (y no haya laminado — la hoja no se lamina)
  const modoAuto = useMemo(() => {
    if (laminado) return "tira"; // laminado solo en tira
    if (!precioHoja || !precioTira || precioTira.error) return "hoja";
    if (precioHoja.error) return "tira";
    return precioHoja.total <= precioTira.total ? "hoja" : "tira";
  }, [precioHoja, precioTira, laminado]);

  const precio = modoAuto === "hoja" ? precioHoja : precioTira;

  return (
    <div className="space-y-4 text-[13px] leading-snug">

      {/* Tamaño + Cantidad */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Tamaño preset */}
        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Tamaño (cm)
          </label>

          <select
            className="select text-[13px] h-9 py-1.5"
            value={sizePreset}
            onChange={(e) => setSizePreset(e.target.value)}
          >
            <option value="5x5">5 × 5</option>
            <option value="7.5x7.5">7.5 × 7.5</option>
            <option value="10x10">10 × 10</option>
            <option value="12.5x12.5">12.5 × 12.5</option>
            <option value="custom">Personalizado</option>
          </select>

          {isCustomSize && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] text-slate-400 mb-1">Ancho (cm) (máx 150)</p>
                <input
                  type="number"
                  min={1}
                  max={150}
                  step="0.1"
                  className="input h-9 py-1.5 text-[13px]"
                  value={width}
                  onChange={(e) => handleWidth(e.target.value)}
                />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 mb-1">Alto (cm)</p>
                <input
                  type="number"
                  min={1}
                  step="0.1"
                  className="input h-9 py-1.5 text-[13px]"
                  value={height}
                  onChange={(e) => handleHeight(e.target.value)}
                />
              </div>

              <p className="col-span-2 text-[11px] text-slate-400">
                *Si el ancho supera 150 cm, se ajustará automáticamente a 150.
              </p>
            </div>
          )}

          {!isCustomSize && (
            <p className="text-[11px] text-slate-400 mt-1">
              Tamaño estándar para cotizar más rápido.
            </p>
          )}
        </div>

        {/* Cantidad preset */}
        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Cantidad
          </label>

          <select
            className="select text-[13px] h-9 py-1.5"
            value={qtyPreset || ""}
            onChange={(e) => update({ stkQtyPreset: e.target.value })}
          >
            <option value="" disabled>
              Selecciona…
            </option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="500">500</option>
            <option value="1000">1000</option>
            <option value="5000">5000</option>
            <option value="10000">10000</option>
            <option value="custom">Personalizada</option>
          </select>

          {isCustomQty && (
            <div className="mt-2">
              <p className="text-[11px] text-slate-400 mb-1">Cantidad personalizada</p>
              <input
                type="number"
                min={1}
                className="input h-9 py-1.5 text-[13px]"
                value={qtyCustom}
                onChange={(e) =>
                  update({ stkQtyCustom: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </div>
          )}

          <p className="text-[11px] text-slate-400 mt-1">
            Se usa para cotizar. Si hay variación, te confirmamos antes de imprimir.
          </p>

          {/* Guardamos también stkQtyApprox por compatibilidad (si algo en tu app lo usa) */}
          <input
            type="hidden"
            value={qtyEffective || ""}
            readOnly
          />
        </div>
      </section>

      <div className="h-px bg-white/10" />

      {/* Material */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Material
        </label>
        <select
          className="select text-[13px] h-9 py-1.5"
          value={material}
          onChange={(e) => update({ stkMaterial: e.target.value })}
        >
          <option value="vinil-mate">Vinil blanco mate</option>
          <option value="vinil-brillante">Vinil blanco brillante</option>
          <option value="vinil-transparente">Vinil transparente</option>
        </select>
      </section>

      <div className="h-px bg-white/10" />

      {/* Corte y protección */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80">
            Tipo de corte
          </label>
          <CutTooltip />
        </div>

        <div className="chips flex flex-wrap gap-2 mb-2">
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${cutType === "individual" ? "chip-active" : ""}`}
            onClick={() => update({ stkCutType: "individual" })}
          >
            Corte completo
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${cutType === "hoja" ? "chip-active" : ""}`}
            onClick={() => update({ stkCutType: "hoja" })}
          >
            Medio corte
          </button>
        </div>

        <label className="inline-flex items-center gap-2 text-[12px] text-slate-200/90">
          <input
            type="checkbox"
            checked={laminado}
            onChange={(e) => update({ stkLaminado: e.target.checked, stkLaminadoTipo: e.target.checked ? (opts.stkLaminadoTipo || "brillante") : undefined })}
          />
          Agregar laminado de protección (recomendado para exterior)
        </label>

        {laminado && (
          <div className="mt-2 pl-1 space-y-1">
            <p className="text-[11px] text-slate-400">Tipo de laminado:</p>
            <div className="chips flex flex-wrap gap-2">
              <button type="button"
                className={`chip text-[11px] py-1.5 ${laminadoTipo === "brillante" ? "chip-active" : ""}`}
                onClick={() => update({ stkLaminadoTipo: "brillante" })}>
                Brillante
              </button>
              <button type="button"
                className={`chip text-[11px] py-1.5 ${laminadoTipo === "mate" ? "chip-active" : ""}`}
                onClick={() => update({ stkLaminadoTipo: "mate" })}>
                Mate
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="h-px bg-white/10" />

      {/* Precio estimado */}
      {precio?.error ? (
        <section className="rounded-xl bg-red-500/10 border border-red-400/25 px-4 py-3 text-[12px] text-red-300">
          ⚠️ {precio.error}
        </section>
      ) : precio ? (
        <section className="rounded-xl bg-orange-500/8 border border-orange-400/20 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 mb-3">Estimado de precio</p>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] text-slate-500 mb-0.5">Por unidad</p>
              <p className="text-xl font-bold text-white tabular-nums">
                ${(precio.total / qtyEffective).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-500 mb-0.5">Total ({qtyEffective} pzas.)</p>
              <p className="text-2xl font-bold text-orange-300 tabular-nums">
                ${precio.total.toFixed(2)}
              </p>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 mt-3">
            * Incluye impresión{laminado ? `, laminado ${laminadoTipo}` : ""} y corte. Precio de referencia, confirmamos antes de producir.
          </p>
        </section>
      ) : (
        <section className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-[12px] text-slate-500 text-center">
          Completa tamaño, cantidad y material para ver el precio estimado.
        </section>
      )}

      <div className="h-px bg-white/10" />

      {/* Notas */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Notas para tus stickers
        </label>
        <textarea
          className="input min-h-[70px] text-[13px] py-2"
          placeholder="Ej. agrupar por diseños, numerar, respetar margen de seguridad para el corte…"
          value={opts.stkNotes || ""}
          onChange={(e) => update({ stkNotes: e.target.value })}
        />
      </section>
    </div>
  );
}
