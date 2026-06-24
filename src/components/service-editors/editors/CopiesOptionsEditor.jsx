import { useMemo } from "react";
import { COPIAS, lookupPrice } from "../../../data/priceList";

// ---------------------------------------------------------------------------
// Tabla de precios — hoja "Copias" de listadepreciospagina2026_modificada23_06_2026.xlsx
// Precio unitario por copia (un lado)
// ---------------------------------------------------------------------------

function normFormat(size) {
  if (size === "Doble carta") return "Doble Carta";
  return size;
}

function lookupCopyPrice(colorMode, colorTech, qty, size) {
  let key;
  if (colorMode === "bn") key = "negro";
  else if (colorTech === "inkjet") key = "colorInkjet";
  else key = "colorLaser";

  const table = COPIAS[key];
  if (!table) return null;
  const fmt = normFormat(size);
  return lookupPrice(table, qty, fmt);
}

export default function CopiesOptionsEditor({ opts, onChangeOptions }) {
  const update = (patch) => onChangeOptions({ ...patch });

  const size       = opts.copySize      || "Carta";
  const colorMode  = opts.copyColorMode || "bn";
  const colorTech  = opts.copyColorTech || "laser";
  const qtyApprox  = opts.copyQtyApprox ?? 1;
  const sides      = opts.copySides     || "simple";

  // ── Cálculo de precio ──────────────────────────────────────────────────────
  const priceResult = useMemo(() => {
    const unitBase = lookupCopyPrice(colorMode, colorTech, qtyApprox, size);
    if (unitBase === null) return null;

    if (sides === "simple") {
      // 5% descuento silencioso
      const unitFinal = unitBase * 0.95;
      return {
        unitFinal,
        total: unitFinal * qtyApprox,
        discountNote: null,
      };
    } else {
      // frente-vuelta: 2 impresiones por copia, 10% descuento
      const unitFinal = unitBase * 0.90;
      return {
        unitFinal,
        total: unitFinal * qtyApprox * 2,
        discountNote: "Incluye 10% de descuento por impresión a dos caras.",
      };
    }
  }, [colorMode, colorTech, qtyApprox, size, sides]);

  const fmtMXN = (n) =>
    n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4 text-[13px] leading-snug">

      {/* ── Tamaño / Tipo de copia ───────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Tamaño del original
          </label>
          <select
            className="select text-[13px] h-9 py-1.5"
            value={size}
            onChange={(e) => update({ copySize: e.target.value })}
          >
            <option value="Carta">Carta</option>
            <option value="Oficio">Oficio</option>
            <option value="Doble carta">Doble carta / Tabloide</option>
            <option value="Otro">Otro tamaño</option>
          </select>
        </div>

        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Tipo de copia
          </label>
          <div className="chips">
            <button
              type="button"
              className={`chip text-[11px] py-1.5 ${colorMode === "bn" ? "chip-active" : ""}`}
              onClick={() => update({ copyColorMode: "bn" })}
            >
              Blanco y negro
            </button>
            <button
              type="button"
              className={`chip text-[11px] py-1.5 ${colorMode === "color" ? "chip-active" : ""}`}
              onClick={() => update({ copyColorMode: "color" })}
            >
              Color
            </button>
          </div>

          {/* Tecnología — solo cuando es color */}
          {colorMode === "color" && (
            <div className="mt-2">
              <p className="text-[10px] text-slate-400 mb-1.5">Tecnología</p>
              <div className="chips">
                <button
                  type="button"
                  className={`chip text-[11px] py-1.5 ${colorTech === "laser" ? "chip-active" : ""}`}
                  onClick={() => update({ copyColorTech: "laser" })}
                >
                  Láser
                </button>
                <button
                  type="button"
                  className={`chip text-[11px] py-1.5 ${colorTech === "inkjet" ? "chip-active" : ""}`}
                  onClick={() => update({ copyColorTech: "inkjet" })}
                >
                  Inyección de tinta
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="h-px bg-white/10" />

      {/* ── Cantidad / Caras ─────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Cantidad aproximada de copias
          </label>
          <input
            type="number"
            min={1}
            className="input h-9 py-1.5 text-[13px]"
            value={qtyApprox}
            onChange={(e) =>
              update({ copyQtyApprox: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </div>

        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Caras a copiar
          </label>
          <select
            className="select text-[13px] h-9 py-1.5"
            value={sides}
            onChange={(e) => update({ copySides: e.target.value })}
          >
            <option value="simple">Solo frente</option>
            <option value="frente-vuelta">Frente y vuelta</option>
          </select>
        </div>
      </section>

      {/* ── Precio estimado ──────────────────────────────── */}
      {priceResult && (
        <div className="rounded-xl bg-emerald-950/60 border border-emerald-700/40 px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400/80">
                Precio estimado
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {qtyApprox} copia{qtyApprox !== 1 ? "s" : ""}
                {sides === "frente-vuelta" ? " × 2 caras" : ""}{" "}
                × ${fmtMXN(priceResult.unitFinal)}
              </p>
              {priceResult.discountNote && (
                <p className="text-[10px] text-sky-400 mt-0.5">
                  {priceResult.discountNote}
                </p>
              )}
            </div>
            <span className="text-[28px] font-bold text-emerald-400 tabular-nums leading-none shrink-0">
              ${fmtMXN(priceResult.total)}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">
            * Estimación basada en lista de precios 2026. El total se confirma antes de imprimir.
          </p>
        </div>
      )}

      <div className="h-px bg-white/10" />

      {/* ── Notas (opcional) ─────────────────────────────── */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1 flex items-center gap-2">
          Notas para este trabajo
          <span className="normal-case tracking-normal text-slate-500 font-normal text-[10px]">(opcional)</span>
        </label>
        <textarea
          className="input min-h-[70px] text-[13px] py-2"
          placeholder="Ej. separar por capítulos, engrapar por paquetes de 20, dejar márgenes amplios…"
          value={opts.copiesNotes || ""}
          onChange={(e) => update({ copiesNotes: e.target.value })}
        />
      </section>
    </div>
  );
}
