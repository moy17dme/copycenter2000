import { LAMINADO } from "../../../data/priceList";

const { rollWidth: ROLL_WIDTHS, precioML: PRICES } = LAMINADO;

/** Dimensiones estándar de papel: { w: ancho, h: alto } en cm */
const SIZE_DIMS = {
  "1/4 Carta":   { w: 10.8, h: 13.9 },
  "1/2 Carta":   { w: 13.9, h: 21.6 },
  Carta:         { w: 21.6, h: 27.9 },
  Oficio:        { w: 21.6, h: 33.0 },
  "Doble Carta": { w: 27.9, h: 43.2 },
  "11x17":       { w: 27.9, h: 43.2 },
  "12x18":       { w: 30.5, h: 45.7 },
  "13x19":       { w: 33.0, h: 48.3 },
};

function tryOrientation(rollWidth, across, feed, qty) {
  const piecesAcross = Math.floor(rollWidth / across);
  if (piecesAcross < 1) return null;
  const rows = Math.ceil(qty / piecesAcross);
  const totalLinearMeters = (rows * feed) / 100;
  return { piecesAcross, rows, totalLinearMeters, acrossDim: across, feedDim: feed };
}

export function calculateLaminationCost({ tipo, grosor, pieceWidth, pieceLength, quantity }) {
  const rollWidth = ROLL_WIDTHS[tipo];
  const w = parseFloat(pieceWidth);
  const h = parseFloat(pieceLength);
  const qty = parseInt(quantity, 10);

  if (!rollWidth || !w || !h || !qty || w <= 0 || h <= 0 || qty <= 0) return null;

  const o1 = tryOrientation(rollWidth, w, h, qty);
  const o2 = tryOrientation(rollWidth, h, w, qty);

  if (!o1 && !o2) return null;

  let best, orientation;
  if (!o1) {
    best = o2; orientation = "paisaje";
  } else if (!o2) {
    best = o1; orientation = "retrato";
  } else if (o1.totalLinearMeters <= o2.totalLinearMeters) {
    best = o1; orientation = "retrato";
  } else {
    best = o2; orientation = "paisaje";
  }

  const pricePerMeter = PRICES[tipo]?.[grosor] ?? 0;
  return {
    ...best,
    orientation,
    pricePerMeter,
    totalCost: parseFloat((best.totalLinearMeters * pricePerMeter).toFixed(2)),
    totalLinearMeters: parseFloat(best.totalLinearMeters.toFixed(4)),
  };
}

/**
 * Sección de laminado.
 * @param {object} props
 * @param {object} props.lam          - opciones actuales de laminado
 * @param {object} props.enm          - opciones de enmicado (para desactivar al activar laminado)
 * @param {function} props.updateFinishes
 * @param {string} props.paperSize    - tamaño de papel seleccionado ("Carta", etc.)
 * @param {number} props.totalSheets  - hojas totales del trabajo (para "todas las hojas")
 */
export default function LaminadoOptions({ lam, enm, updateFinishes, paperSize, totalSheets = 1 }) {
  const tipo   = lam.tipo   || "brillante";
  const grosor = lam.grosor || "1.5";

  // Dimensiones del tamaño de papel seleccionado arriba
  const dims = SIZE_DIMS[paperSize] || {};

  // Si "todas las hojas" está activo, usamos dims del papel y totalSheets como cantidad
  const allSheets = !!lam.allSheets;
  const pieceWidth  = allSheets ? (dims.w ?? "") : (lam.pieceWidth  ?? (dims.w ?? ""));
  const pieceLength = allSheets ? (dims.h ?? "") : (lam.pieceLength ?? (dims.h ?? ""));
  const quantity    = allSheets ? totalSheets     : (lam.quantity ?? 1);

  const rollWidth = ROLL_WIDTHS[tipo];
  const pw = parseFloat(pieceWidth);
  const ph = parseFloat(pieceLength);

  const mateUnavailable = tipo === "mate" && pw > 28 && ph > 28;
  const tooBig = !mateUnavailable && pw > rollWidth && ph > rollWidth;

  const result =
    lam.enabled && !mateUnavailable && !tooBig
      ? calculateLaminationCost({ tipo, grosor, pieceWidth, pieceLength, quantity })
      : null;

  const update = (patch) =>
    updateFinishes({
      laminado: { ...lam, ...patch },
      ...(patch.enabled ? { enmicado: { ...enm, enabled: false } } : {}),
    });

  return (
    <div className="space-y-2">
      <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
        Laminado
      </label>

      <label className="inline-flex items-center gap-2 text-slate-200/90 text-[12px]">
        <input
          type="checkbox"
          checked={!!lam.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
        />
        Activar laminado
      </label>

      {lam.enabled && (
        <div className="space-y-3 pt-1">

          {/* ── Todas las hojas del trabajo ── */}
          <label className="inline-flex items-start gap-2 text-slate-200/90 text-[12px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={allSheets}
              onChange={(e) => update({ allSheets: e.target.checked })}
            />
            <span>
              Laminar <strong>todas las hojas</strong> del trabajo
              {allSheets && dims.w && (
                <span className="ml-1 text-slate-400">
                  ({totalSheets} hoja{totalSheets !== 1 ? "s" : ""} · {dims.w} × {dims.h} cm · {paperSize})
                </span>
              )}
            </span>
          </label>

          {/* Tipo */}
          <div>
            <span className="text-[11px] text-slate-300/80 block mb-1">Tipo</span>
            <div className="chips">
              <button
                type="button"
                className={`chip text-[11px] py-1.5 ${tipo === "brillante" ? "chip-active" : ""}`}
                onClick={() => update({ tipo: "brillante" })}
              >
                Brillante <span className="text-slate-400 ml-0.5">(rollo 61 cm)</span>
              </button>
              <button
                type="button"
                className={`chip text-[11px] py-1.5 ${tipo === "mate" ? "chip-active" : ""}`}
                onClick={() => update({ tipo: "mate", grosor: "1.5" })}
              >
                Mate <span className="text-slate-400 ml-0.5">(rollo 28 cm)</span>
              </button>
            </div>
          </div>

          {/* Grosor */}
          <div>
            <span className="text-[11px] text-slate-300/80 block mb-1">
              Grosor
              {tipo === "mate" && (
                <span className="ml-1 text-slate-400">(solo 1.5 mil disponible en Mate)</span>
              )}
            </span>
            <div className="chips">
              <button
                type="button"
                className={`chip text-[11px] py-1.5 ${grosor === "1.5" ? "chip-active" : ""}`}
                onClick={() => update({ grosor: "1.5" })}
              >
                1.5 milésimas — $60/m
              </button>
              {tipo === "brillante" && (
                <button
                  type="button"
                  className={`chip text-[11px] py-1.5 ${grosor === "5" ? "chip-active" : ""}`}
                  onClick={() => update({ grosor: "5" })}
                >
                  5 milésimas — $105/m
                </button>
              )}
            </div>
          </div>

          {/* Dimensiones — solo manual cuando NO es allSheets */}
          {!allSheets && (
            <div>
              <span className="text-[11px] text-slate-300/80 block mb-1">
                Dimensiones de la pieza
                {dims.w && (
                  <span className="ml-1 text-slate-400">(pre-llenado desde {paperSize})</span>
                )}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Ancho (cm)</span>
                  <input
                    type="number"
                    className="input text-[13px] h-8 py-1"
                    min={0.1}
                    step={0.1}
                    value={pieceWidth}
                    onChange={(e) => update({ pieceWidth: e.target.value })}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Largo (cm)</span>
                  <input
                    type="number"
                    className="input text-[13px] h-8 py-1"
                    min={0.1}
                    step={0.1}
                    value={pieceLength}
                    onChange={(e) => update({ pieceLength: e.target.value })}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Cantidad</span>
                  <input
                    type="number"
                    className="input text-[13px] h-8 py-1"
                    min={1}
                    step={1}
                    value={quantity}
                    onChange={(e) =>
                      update({ quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Avisos */}
          {mateUnavailable && (
            <div className="text-[11px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg p-2.5">
              Tu pieza ({pw} × {ph} cm) no cabe en el rollo Mate (28 cm). Selecciona{" "}
              <strong>Brillante</strong> para continuar.
            </div>
          )}
          {tooBig && (
            <div className="text-[11px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-2.5">
              Tu pieza ({pw} × {ph} cm) supera el ancho del rollo{" "}
              {tipo} ({rollWidth} cm) en cualquier orientación. Verifica las dimensiones.
            </div>
          )}

          {/* Desglose visual */}
          {result && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1.5 text-[12px]">
              <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-1">
                Orientación óptima:{" "}
                <span className="text-white font-medium">
                  {result.acrossDim.toFixed(1)} cm a lo ancho
                  {result.orientation === "paisaje" ? " (rotada)" : ""}
                </span>
              </p>
              <p className="text-slate-200/90">
                Caben{" "}
                <span className="font-semibold text-white">
                  {result.piecesAcross} pieza{result.piecesAcross !== 1 ? "s" : ""}
                </span>{" "}
                a lo ancho del rollo ({rollWidth} cm)
              </p>
              <p className="text-slate-200/90">
                Se usarán{" "}
                <span className="font-semibold text-white">
                  {result.totalLinearMeters.toFixed(2)} m lineales
                </span>{" "}
                <span className="text-slate-400">
                  ({result.rows} fila{result.rows !== 1 ? "s" : ""} × {result.feedDim.toFixed(1)} cm)
                </span>
              </p>
              <div className="h-px bg-white/10 my-1" />
              <p className="text-slate-200/90">
                Costo estimado:{" "}
                <span className="font-semibold text-emerald-400">
                  ${result.totalCost.toFixed(2)} MXN
                </span>
                <span className="text-slate-400 ml-1.5 text-[11px]">
                  (${result.pricePerMeter}/m × {result.totalLinearMeters.toFixed(2)} m)
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
