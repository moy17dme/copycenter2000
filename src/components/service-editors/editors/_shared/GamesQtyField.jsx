// src/components/service-editors/editors/_shared/GamesQtyField.jsx
import { useMemo } from "react";

export default function GamesQtyField({
  opts,
  onChangeOptions,
  label = "Cantidad de juegos",
  helper = "Ej. 10 juegos iguales del mismo archivo.",
  min = 1,
}) {
  const value = useMemo(() => {
    const v = Number(opts?.gamesQty ?? 1);
    return Number.isFinite(v) && v >= min ? v : min;
  }, [opts, min]);

  return (
    <div className="mt-5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300/80">
        {label}
      </div>

      <div className="mt-2 flex items-start gap-3">
        <input
          type="number"
          min={min}
          value={value}
          onChange={(e) => {
            const next = Math.max(min, Number(e.target.value || min));
            onChangeOptions?.({ gamesQty: next });
          }}
          className="w-28 rounded-xl bg-white px-3 py-2 text-sm text-slate-900 outline-none"
        />

        <p className="text-xs text-slate-300/80 leading-relaxed pt-1">
          {helper}
        </p>
      </div>
    </div>
  );
}
