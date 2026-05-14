import GamesQtyField from "./_shared/GamesQtyField";

export default function ArtsOptionsEditor({ opts, onChangeOptions }) {
  const update = (patch) => onChangeOptions({ ...patch });

  const projectType = opts.artProjectType || "tarjetas";
  const outputType = opts.artOutputType || "arte-listo";
  const size = opts.artSize || "";
  const qtyApprox = opts.artQtyApprox || "";
  const mainFinish = opts.artMainFinish || "ninguno";
  const urgency = opts.artUrgency || "normal";

  return (
    <div className="space-y-4 text-[13px] leading-snug">
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Tipo de proyecto
        </label>
        <select
          className="select text-[13px] h-9 py-1.5"
          value={projectType}
          onChange={(e) => update({ artProjectType: e.target.value })}
        >
          <option value="tarjetas">Tarjetas de presentación</option>
          <option value="volantes">Volantes / trípticos / dípticos</option>
          <option value="menus">Menús y cartas</option>
          <option value="posters">Posters / carteles</option>
          <option value="lona">Lonas y publicidad gran formato</option>
          <option value="vinil">Vinil recortado / rotulación</option>
          <option value="logo">Logo / imagen corporativa</option>
          <option value="otro">Otro (especificar en notas)</option>
        </select>
      </section>

      <div className="h-px bg-white/10" />

      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          ¿Qué necesitas que te entreguemos?
        </label>
        <div className="chips flex flex-wrap gap-2">
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${
              outputType === "arte-listo" ? "chip-active" : ""
            }`}
            onClick={() => update({ artOutputType: "arte-listo" })}
          >
            Solo arte listo para imprimir (PDF/JPG)
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${
              outputType === "incluye-impresion" ? "chip-active" : ""
            }`}
            onClick={() => update({ artOutputType: "incluye-impresion" })}
          >
            Arte + impresión con Copy Center 2000
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${
              outputType === "editable" ? "chip-active" : ""
            }`}
            onClick={() => update({ artOutputType: "editable" })}
          >
            Archivo editable (Illustrator / Photoshop)
          </button>
        </div>
      </section>

      <div className="h-px bg-white/10" />

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Tamaño / formato final
          </label>
          <input
            className="input h-9 py-1.5 text-[13px]"
            placeholder="Ej. 9×5 cm, carta, tabloide, 60×90 cm…"
            value={size}
            onChange={(e) => update({ artSize: e.target.value })}
          />
        </div>
        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Cantidad aproximada
          </label>
          <input
            type="number"
            min={1}
            className="input h-9 py-1.5 text-[13px]"
            placeholder="Ej. 500"
            value={qtyApprox}
            onChange={(e) =>
              update({ artQtyApprox: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </div>
      </section>

      <div className="h-px bg-white/10" />

      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Acabado principal
        </label>
        <select
          className="select text-[13px] h-9 py-1.5"
          value={mainFinish}
          onChange={(e) => update({ artMainFinish: e.target.value })}
        >
          <option value="ninguno">Sin acabado especial</option>
          <option value="laminado-mate">Laminado mate</option>
          <option value="laminado-brillante">Laminado brillante</option>
          <option value="uv">Barniz UV / relieve</option>
          <option value="montado-foam">Montado en foamboard</option>
          <option value="doblado">Doblado (tríptico / díptico)</option>
          <option value="otro">Otro (especificar en notas)</option>
        </select>
      </section>

      <div className="h-px bg-white/10" />

      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Urgencia / fecha objetivo
        </label>
        <select
          className="select text-[13px] h-9 py-1.5"
          value={urgency}
          onChange={(e) => update({ artUrgency: e.target.value })}
        >
          <option value="normal">Normal (3–5 días)</option>
          <option value="urgente">Urgente (24–48 horas)</option>
          <option value="fecha">Tengo una fecha específica (indicar en notas)</option>
        </select>
      </section>

      <div className="h-px bg-white/10" />

      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Descripción / referencias <span className="normal-case text-slate-500">(opcional)</span>
        </label>
        <textarea
          className="input min-h-[80px] py-2 text-[13px]"
          placeholder="Describe tu idea, colores preferidos, referencias de diseño, texto que debe incluir, etc."
          value={opts.artNotes || ""}
          onChange={(e) => update({ artNotes: e.target.value })}
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Mientras más detalle nos des, más rápido podemos avanzar con tu arte.
        </p>
      </section>
    </div>
  );
}
