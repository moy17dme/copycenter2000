import { useMemo } from "react";

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

  // ====== UI helpers ======
  const isCustomQty = qtyPreset === "custom";
  const isCustomSize = sizePreset === "custom";

  return (
    <div className="space-y-4 text-[13px] leading-snug">
      {/* Forma */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Forma del sticker
        </label>
        <div className="chips flex flex-wrap gap-2">
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${shape === "redondo" ? "chip-active" : ""}`}
            onClick={() => update({ stkShape: "redondo" })}
          >
            Redondos
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${shape === "cuadrado" ? "chip-active" : ""}`}
            onClick={() => update({ stkShape: "cuadrado" })}
          >
            Cuadrados / rectangulares
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${shape === "contorno" ? "chip-active" : ""}`}
            onClick={() => update({ stkShape: "contorno" })}
          >
            Corte al contorno (figura)
          </button>
        </div>
      </section>

      <div className="h-px bg-white/10" />

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

      {/* Material + Uso */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
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
        </div>

        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Uso
          </label>
          <select
            className="select text-[13px] h-9 py-1.5"
            value={usage}
            onChange={(e) => update({ stkUsage: e.target.value })}
          >
            <option value="interior">Interior</option>
            <option value="exterior">Exterior</option>
          </select>
        </div>
      </section>

      <div className="h-px bg-white/10" />

      {/* Corte y protección */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Corte y protección
        </label>

        <div className="chips flex flex-wrap gap-2 mb-2">
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${cutType === "hoja" ? "chip-active" : ""}`}
            onClick={() => update({ stkCutType: "hoja" })}
          >
            En hoja (muchos por página)
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${cutType === "individual" ? "chip-active" : ""}`}
            onClick={() => update({ stkCutType: "individual" })}
          >
            Individuales (troquelados)
          </button>
        </div>

        <label className="inline-flex items-center gap-2 text-[12px] text-slate-200/90">
          <input
            type="checkbox"
            checked={laminado}
            onChange={(e) => update({ stkLaminado: e.target.checked })}
          />
          Agregar laminado de protección (recomendado para exterior)
        </label>
      </section>

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
