// src/components/service-editors/editors/PinsOptionsEditor.jsx
import { useMemo } from "react";
import GamesQtyField from "./_shared/GamesQtyField";

// ── Precios fotobotones 5.8 cm (lista 2026) ───────────────────────────────────
const PIN_PRICES = {
  pin:        [{ min: 1, max: 10, u: 17.00 }, { min: 11, max: 50, u: 15.00 }, { min: 51, max: 100, u: 13.42 }, { min: 101, max: 200, u: 10.99 }, { min: 201, max: Infinity, u:  9.00 }],
  destapador: [{ min: 1, max: 10, u: 20.00 }, { min: 11, max: 50, u: 15.00 }, { min: 51, max: 100, u: 13.42 }, { min: 101, max: 200, u: 10.99 }, { min: 201, max: Infinity, u:  9.00 }],
  imantado:   [{ min: 1, max: 10, u: 25.00 }, { min: 11, max: 50, u: 20.00 }, { min: 51, max: 100, u: 15.00 }, { min: 101, max: 200, u: 12.00 }, { min: 201, max: Infinity, u: 10.00 }],
  llavero:    [{ min: 1, max: 10, u: 28.00 }, { min: 11, max: 50, u: 22.00 }, { min: 51, max: 100, u: 17.00 }, { min: 101, max: 200, u: 15.00 }, { min: 201, max: Infinity, u: 12.00 }],
};

function lookupPinPrice(type, qty) {
  const table = PIN_PRICES[type] ?? PIN_PRICES.pin;
  const row = table.find((r) => qty >= r.min && qty <= r.max);
  return row ? row.u : table[table.length - 1].u;
}

const fmtMXN = (n) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPE_LABELS = {
  pin:        "Pin normal",
  imantado:   "Imantado",
  llavero:    "Llavero",
  destapador: "Destapador",
};

export default function PinsOptionsEditor({ opts = {}, onChangeOptions }) {
  const type  = opts.pinType  ?? "pin";
  const notes = opts.pinNotes ?? "";
  const qty   = Math.max(1, Number(opts.gamesQty ?? 1));

  const setOpt = (patch) => onChangeOptions?.({ ...patch });

  const priceResult = useMemo(() => {
    const unit  = lookupPinPrice(type, qty);
    const total = unit * qty;
    return { unit, total };
  }, [type, qty]);

  return (
    <div className="space-y-4 text-[13px] leading-snug">
      <p className="text-xs text-slate-300/80">
        Configura tu pedido de fotobotones/pines.
      </p>

      {/* Tamaño — fijo según lista de precios 2026 */}
      <div>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Tamaño
        </label>
        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-slate-200">
          5.8 cm (58 mm) — estándar
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* Tipo */}
      <div>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Tipo de fotobotón
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(TYPE_LABELS).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setOpt({ pinType: k })}
              className={`px-3 py-2 rounded-xl text-sm border text-left ${
                type === k
                  ? "bg-orange-400 text-black border-orange-400"
                  : "bg-white/5 text-white border-white/15 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* Cantidad */}
      <div>
        <label className="block text-xs text-slate-200 mb-1">
          Cantidad de piezas
        </label>
        <GamesQtyField
          opts={opts}
          onChangeOptions={onChangeOptions}
          label="Cantidad de piezas"
          helper="Número total de fotobotones que necesitas."
        />
      </div>

      <div className="h-px bg-white/10" />

      {/* Notas (opcional) */}
      <div>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Notas <span className="normal-case text-slate-500">(opcional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setOpt({ pinNotes: e.target.value })}
          rows={3}
          placeholder="Ej. 'Con borde negro', 'logo centrado', etc."
          className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none"
        />
      </div>

      {/* ── Precio estimado ────────────────────────────────────── */}
      <div className="h-px bg-white/10" />

      <div className="rounded-xl bg-emerald-950/60 border border-emerald-700/40 px-4 py-3 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400/80">
          Precio estimado
        </p>

        <div className="space-y-1 text-[12px] text-slate-300/90">
          <div className="flex justify-between">
            <span>Tipo</span>
            <span className="font-medium text-white">{TYPE_LABELS[type]}</span>
          </div>
          <div className="flex justify-between">
            <span>Tamaño</span>
            <span className="font-medium text-white">5.8 cm</span>
          </div>
          <div className="flex justify-between">
            <span>Precio por pieza</span>
            <span className="font-medium text-white tabular-nums">
              ${fmtMXN(priceResult.unit)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Piezas</span>
            <span className="font-medium text-white tabular-nums">× {qty}</span>
          </div>
        </div>

        <div className="h-px bg-white/10 mt-1" />

        <div className="flex items-end justify-between gap-3">
          <p className="text-[10px] text-slate-500 max-w-[180px]">
            El precio varía según la cantidad total de piezas. Incluye impresión a color.
          </p>
          <span className="text-[28px] font-bold text-emerald-400 tabular-nums leading-none shrink-0">
            ${fmtMXN(priceResult.total)}
          </span>
        </div>

        <p className="text-[10px] text-slate-500">
          * Estimación basada en lista de precios 2026. El total se confirma en sucursal.
        </p>
      </div>
    </div>
  );
}
