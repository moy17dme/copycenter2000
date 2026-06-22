export default function BindingOptionsEditor({ opts = {}, onChangeOptions }) {
  const update = (patch) => onChangeOptions?.({ ...patch });
  const pages = Math.max(1, Number(opts.bindPages ?? 1));
  const quantity = Math.max(1, Number(opts.bindQty ?? 1));

  return (
    <div className="space-y-4 text-[13px] leading-snug">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label mb-1 text-[11px] uppercase tracking-[0.16em] text-slate-300/80">
            Tipo de arillo
          </label>
          <select
            className="select h-10"
            value={opts.bindType || "metalico"}
            onChange={(event) => update({ bindType: event.target.value })}
          >
            <option value="metalico">Metálico</option>
            <option value="plastico">Plástico</option>
          </select>
        </div>
        <div>
          <label className="label mb-1 text-[11px] uppercase tracking-[0.16em] text-slate-300/80">
            Páginas por juego
          </label>
          <input
            type="number"
            min={1}
            className="input h-10"
            value={pages}
            onChange={(event) =>
              update({ bindPages: Math.max(1, Number(event.target.value) || 1) })
            }
          />
        </div>
      </div>

      <div>
        <label className="label mb-1 text-[11px] uppercase tracking-[0.16em] text-slate-300/80">
          Cantidad de engargolados
        </label>
        <input
          type="number"
          min={1}
          className="input h-10"
          value={quantity}
          onChange={(event) =>
            update({ bindQty: Math.max(1, Number(event.target.value) || 1) })
          }
        />
      </div>

      <div>
        <label className="label mb-1 text-[11px] uppercase tracking-[0.16em] text-slate-300/80">
          Notas <span className="normal-case tracking-normal text-slate-500">(opcional)</span>
        </label>
        <textarea
          className="input min-h-[72px] py-2"
          value={opts.bindNotes || ""}
          placeholder="Ej. pasta negra, separar por capítulos o indicar color del arillo"
          onChange={(event) => update({ bindNotes: event.target.value })}
        />
      </div>
    </div>
  );
}
