import GamesQtyField from "./_shared/GamesQtyField";

export default function PlansOptionsEditor({ opts, onChangeOptions }) {
  const update = (patch) => onChangeOptions({ ...patch });

  const colorMode = opts.planColorMode || "bn";
  const paper = opts.planPaper || "Bond 90 g";
  const sizeKey = opts.planSizeKey || "90x60";
  const deliver = opts.planDeliver || "doblado";
  const foldType = opts.planFoldType || "protector";
  const planType = opts.planType || "arquitectonico";
  const heavy = !!opts.planHeavy;

  return (
    <div className="space-y-5 text-[13px] leading-snug">
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Tipo de papel
        </label>
        <select
          className="select text-[13px] h-9 py-1.5"
          value={paper}
          onChange={(e) => update({ planPaper: e.target.value })}
        >
          <option>Bond 75 g</option>
          <option>Bond 90 g</option>
          <option>Bond 90 g (blanco intenso)</option>
          <option>Papel reciclado</option>
          <option>Papel vegetal</option>
          <option>Calca / Traslúcido</option>
        </select>
        <p className="mt-1 text-[11px] text-slate-400">
          Si necesitas otro tipo de papel, indícalo en las notas del pedido.
        </p>
      </section>

      <div className="h-px bg-white/10" />

      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Tipo de plano
        </label>
        <div className="chips flex flex-wrap gap-2">
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${
              planType === "arquitectonico" ? "chip-active" : ""
            }`}
            onClick={() => update({ planType: "arquitectonico" })}
          >
            Arquitectónico
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${
              planType === "estructural" ? "chip-active" : ""
            }`}
            onClick={() => update({ planType: "estructural" })}
          >
            Estructural
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${
              planType === "instalaciones" ? "chip-active" : ""
            }`}
            onClick={() => update({ planType: "instalaciones" })}
          >
            Instalaciones
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${
              planType === "otro" ? "chip-active" : ""
            }`}
            onClick={() => update({ planType: "otro" })}
          >
            Otro
          </button>
        </div>

        <label className="mt-2 inline-flex items-center gap-2 text-[12px] text-slate-200/90">
          <input
            type="checkbox"
            checked={heavy}
            onChange={(e) => update({ planHeavy: e.target.checked })}
          />
          Dibujo muy cargado (muchos hatch / rellenos / imágenes)
        </label>
      </section>

      <div className="h-px bg-white/10" />

      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Tipo de impresión
        </label>
        <div className="chips">
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${
              colorMode === "bn" ? "chip-active" : ""
            }`}
            onClick={() => update({ planColorMode: "bn" })}
          >
            Solo líneas / B&N
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${
              colorMode === "color" ? "chip-active" : ""
            }`}
            onClick={() => update({ planColorMode: "color" })}
          >
            Color (CAD con rellenos / imágenes)
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Úsalo para diferenciar planos solo de línea o planos con rellenos, sombreados e imágenes.
        </p>
      </section>

      <div className="h-px bg-white/10" />

      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Tamaño / escala de impresión
        </label>

        <select
          className="select text-[13px] h-9 py-1.5"
          value={sizeKey}
          onChange={(e) => update({ planSizeKey: e.target.value })}
        >
          <option value="90x60">90 × 60 cm (estándar obra)</option>
          <option value="90x120">90 × 120 cm</option>
          <option value="60x40">60 × 40 cm</option>
          <option value="a1">A1 (59.4 × 84.1 cm)</option>
          <option value="a2">A2 (42.0 × 59.4 cm)</option>
          <option value="custom">Otro tamaño / escala</option>
        </select>

        {sizeKey === "custom" && (
          <div className="mt-2 space-y-1">
            <input
              className="input h-9 py-1.5 text-[13px]"
              placeholder="Ej. 1:75 en 70 × 50 cm"
              value={opts.planSizeCustom || ""}
              onChange={(e) =>
                update({
                  planSizeKey: "custom",
                  planSizeCustom: e.target.value,
                })
              }
            />
            <p className="text-[11px] text-slate-400">
              Indica escala o medidas finales (sobre todo para archivos CAD).
            </p>
          </div>
        )}
      </section>

      <div className="h-px bg-white/10" />

      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Forma de entrega
        </label>

        <div className="chips flex flex-wrap gap-2">
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${
              deliver === "enrollado" ? "chip-active" : ""
            }`}
            onClick={() => update({ planDeliver: "enrollado", planFoldType: undefined })}
          >
            Enrollados
          </button>

          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${
              deliver === "doblado" ? "chip-active" : ""
            }`}
            onClick={() => update({ planDeliver: "doblado", planFoldType: foldType || "protector" })}
          >
            Doblados (sin costo)
          </button>
        </div>

        {deliver === "doblado" && (
          <div className="mt-3 space-y-2">
            <span className="text-[11px] text-slate-300/90 block">
              ¿Cómo se van a usar los planos doblados?
            </span>

            <div className="chips flex flex-wrap gap-2">
              <button
                type="button"
                className={`chip text-[11px] py-1.5 ${
                  foldType === "protector" ? "chip-active" : ""
                }`}
                onClick={() => update({ planDeliver: "doblado", planFoldType: "protector" })}
              >
                Para protector tamaño carta/A4
              </button>

              <button
                type="button"
                className={`chip text-[11px] py-1.5 ${
                  foldType === "perforar" ? "chip-active" : ""
                }`}
                onClick={() => update({ planDeliver: "doblado", planFoldType: "perforar" })}
              >
                Para perforar / carpeta
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Ajustamos el doblado pensando en protectores o perforación, según lo que elijas.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
