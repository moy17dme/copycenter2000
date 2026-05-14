// src/components/service-editors/editors/PvcOptionsEditor.jsx
import { useMemo } from "react";
import GamesQtyField from "./_shared/GamesQtyField";

// ── Precios tarjetas PVC (lista 2026) ─────────────────────────────────────────
const PVC_PRICES = {
  unLado: {
    normal:    [{ min: 1, max: 10, u: 30 }, { min: 11, max: 25, u: 25 }, { min: 26, max: 100, u: 20 }, { min: 101, max: Infinity, u: 18 }],
    perforada: [{ min: 1, max: 10, u: 32 }, { min: 11, max: 25, u: 27 }, { min: 26, max: 100, u: 22 }, { min: 101, max: Infinity, u: 20 }],
    nfc:       [{ min: 1, max: 10, u: 40 }, { min: 11, max: 25, u: 35 }, { min: 26, max: 100, u: 30 }, { min: 101, max: Infinity, u: 25 }],
    magnetica: [{ min: 1, max: 10, u: 45 }, { min: 11, max: 25, u: 40 }, { min: 26, max: 100, u: 35 }, { min: 101, max: Infinity, u: 30 }],
  },
  ambosLados: {
    normal:    [{ min: 1, max: 10, u: 50 }, { min: 11, max: 25, u: 45 }, { min: 26, max: 100, u: 30 }, { min: 101, max: Infinity, u: 25 }],
    perforada: [{ min: 1, max: 10, u: 52 }, { min: 11, max: 25, u: 47 }, { min: 26, max: 100, u: 32 }, { min: 101, max: Infinity, u: 30 }],
    nfc:       [{ min: 1, max: 10, u: 55 }, { min: 11, max: 25, u: 50 }, { min: 26, max: 100, u: 45 }, { min: 101, max: Infinity, u: 35 }],
    magnetica: [{ min: 1, max: 10, u: 57 }, { min: 11, max: 25, u: 50 }, { min: 26, max: 100, u: 46 }, { min: 101, max: Infinity, u: 40 }],
  },
};

function lookupPvcPrice(variant, sides, qty) {
  const sidesKey = sides === "frente-vuelta" ? "ambosLados" : "unLado";
  const table = PVC_PRICES[sidesKey][variant] ?? PVC_PRICES[sidesKey].normal;
  const row = table.find((r) => qty >= r.min && qty <= r.max);
  return row ? row.u : table[table.length - 1].u;
}

const fmtMXN = (n) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const VARIANT_LABELS = {
  normal:    "Normal",
  perforada: "Con perforación",
  nfc:       "NFC",
  magnetica: "Tira magnética",
};

export default function PvcOptionsEditor({ opts, onChangeOptions }) {
  const update = (patch) => onChangeOptions({ ...patch });

  const variant  = opts.pvcVariant || "normal";
  const pvcSides = opts.pvcSides   || "frente";
  const qty      = Math.max(1, Number(opts.gamesQty ?? 1));

  const priceResult = useMemo(() => {
    const unit  = lookupPvcPrice(variant, pvcSides, qty);
    const total = unit * qty;
    return { unit, total };
  }, [variant, pvcSides, qty]);

  return (
    <div className="space-y-6 text-[13px] leading-snug">

      {/* Tipo de tarjeta */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-2">
          Tipo de tarjeta
        </label>
        <div className="chips flex flex-wrap gap-2">
          {Object.entries(VARIANT_LABELS).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`chip text-[11px] py-1.5 ${variant === k ? "chip-active" : ""}`}
              onClick={() => update({ pvcVariant: k })}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="h-px bg-white/10" />

      {/* Lados de impresión */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-2">
          Lados de impresión
        </label>
        <div className="chips flex flex-wrap gap-2">
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${pvcSides === "frente" ? "chip-active" : ""}`}
            onClick={() => update({ pvcSides: "frente" })}
          >
            Solo frente
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${pvcSides === "frente-vuelta" ? "chip-active" : ""}`}
            onClick={() => update({ pvcSides: "frente-vuelta" })}
          >
            Frente y vuelta
          </button>
        </div>
      </section>

      <div className="h-px bg-white/10" />

      {/* Cantidad */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-2">
          Cantidad de tarjetas
        </label>
        <GamesQtyField
          opts={opts}
          onChangeOptions={onChangeOptions}
          label="Cantidad de tarjetas"
          helper="Número total de credenciales que necesitas."
        />
      </section>

      <div className="h-px bg-white/10" />

      {/* Notas */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Notas <span className="normal-case text-slate-500">(opcional)</span>
        </label>
        <textarea
          className="input min-h-[70px] text-[13px] py-2"
          placeholder="Ej. incluir folio, QR, foto, tipo de cordón, etc."
          value={opts.pvcNotes || ""}
          onChange={(e) => update({ pvcNotes: e.target.value })}
        />
      </section>

      {/* ── Precio estimado ────────────────────────────────────── */}
      <div className="h-px bg-white/10" />

      <div className="rounded-xl bg-emerald-950/60 border border-emerald-700/40 px-4 py-3 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400/80">
          Precio estimado
        </p>

        <div className="space-y-1 text-[12px] text-slate-300/90">
          <div className="flex justify-between">
            <span>Tipo</span>
            <span className="font-medium text-white">{VARIANT_LABELS[variant]}</span>
          </div>
          <div className="flex justify-between">
            <span>Lados</span>
            <span className="font-medium text-white">
              {pvcSides === "frente-vuelta" ? "Frente y vuelta" : "Solo frente"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Precio por tarjeta</span>
            <span className="font-medium text-white tabular-nums">
              ${fmtMXN(priceResult.unit)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tarjetas</span>
            <span className="font-medium text-white tabular-nums">× {qty}</span>
          </div>
        </div>

        <div className="h-px bg-white/10 mt-1" />

        <div className="flex items-end justify-between gap-3">
          <p className="text-[10px] text-slate-500 max-w-[180px]">
            El precio varía según tipo, lados y cantidad. Accesorios se cotizan por separado.
          </p>
          <span className="text-[28px] font-bold text-emerald-400 tabular-nums leading-none shrink-0">
            ${fmtMXN(priceResult.total)}
          </span>
        </div>

        <p className="text-[10px] text-slate-500">
          * Estimación basada en lista de precios 2026. El total se confirma antes de producir.
        </p>
      </div>
    </div>
  );
}
