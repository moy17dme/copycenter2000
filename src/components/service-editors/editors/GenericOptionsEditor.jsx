import GamesQtyField from "./_shared/GamesQtyField";

export default function GenericOptionsEditor({ opts = {}, onChangeOptions }) {
  const update = (patch) => onChangeOptions?.({ ...patch });

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-300/80">
        Opciones básicas para este archivo.
      </p>

      <div>
        <label className="label text-white/80">Notas</label>
        <textarea
          className="input min-h-[80px]"
          value={opts.notes || ""}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}
