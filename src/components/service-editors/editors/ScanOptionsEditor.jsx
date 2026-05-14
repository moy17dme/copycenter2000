import { useMemo } from "react";

// ── Precios de escaneo (lista 2026) ───────────────────────────────────────────
// Variable: tamaño del original + cantidad de páginas escaneadas.
// El color / DPI no afectan el precio.
const SCAN_PRICES = {
  "carta-oficio": [
    { min: 1,    max: 50,   unit: 3.00  },
    { min: 51,   max: 100,  unit: 2.27  },
    { min: 101,  max: 200,  unit: 1.47  },
    { min: 201,  max: 500,  unit: 0.95  },
    { min: 501,  max: 1000, unit: 0.62  },
    { min: 1001, max: Infinity, unit: 0.40 },
  ],
  "doble-carta": [
    { min: 1,    max: 50,   unit: 6.00 },
    { min: 51,   max: 100,  unit: 5.00 },
    { min: 101,  max: 200,  unit: 4.00 },
    { min: 201,  max: 500,  unit: 3.00 },
    { min: 501,  max: 1000, unit: 2.00 },
    { min: 1001, max: Infinity, unit: 1.00 },
  ],
  "plano": [
    { min: 1,    max: 50,   unit: 30.00 },
    { min: 51,   max: 100,  unit: 25.00 },
    { min: 101,  max: 200,  unit: 20.00 },
    { min: 201,  max: 500,  unit: 15.00 },
    { min: 501,  max: 1000, unit: 10.00 },
    { min: 1001, max: Infinity, unit: 6.00 },
  ],
};

function sizeToCategory(size) {
  if (size === "Doble carta") return "doble-carta";
  if (size?.startsWith("Plano")) return "plano";
  return "carta-oficio"; // Carta, Oficio
}

function lookupScanPrice(size, effectiveQty) {
  const cat = sizeToCategory(size);
  const table = SCAN_PRICES[cat];
  const row = table.find((r) => effectiveQty >= r.min && effectiveQty <= r.max);
  return row ? row.unit : table[table.length - 1].unit;
}

const fmtMXN = (n) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ScanOptionsEditor({ opts, onChangeOptions }) {
  const update = (patch) => onChangeOptions({ ...patch });

  const colorMode = opts.scanColorMode || "bn";
  const size      = opts.scanSize      || "Carta";
  const duplex    = opts.scanDuplex    || "simple";
  const dpi       = opts.scanDpi       || "300";
  const output    = opts.scanOutput    || "pdf-unico";
  const delivery  = opts.scanDelivery  || "correo";
  const qty       = Math.max(1, parseInt(opts.scanQtyApprox) || 1);

  // Páginas efectivas: frente-y-vuelta cuenta doble
  const effectiveQty = duplex === "dorso" ? qty * 2 : qty;

  const priceResult = useMemo(() => {
    const unit  = lookupScanPrice(size, effectiveQty);
    const total = unit * effectiveQty;
    return { unit, total };
  }, [size, effectiveQty]);

  const sizeLabel = {
    "Carta":       "Carta",
    "Oficio":      "Oficio",
    "Doble carta": "Doble carta / Tabloide",
    "Plano A3":    "Plano A3",
    "Plano A2":    "Plano A2",
    "Plano A1":    "Plano A1",
    "Plano A0":    "Plano A0",
  }[size] || size;

  return (
    <div className="space-y-4 text-[13px] leading-snug">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Tamaño del original
          </label>
          <select
            className="select text-[13px] h-9 py-1.5"
            value={size}
            onChange={(e) => update({ scanSize: e.target.value })}
          >
            <option value="Carta">Carta</option>
            <option value="Oficio">Oficio</option>
            <option value="Doble carta">Doble carta / Tabloide</option>
            <option value="Plano A3">Plano A3</option>
            <option value="Plano A2">Plano A2</option>
            <option value="Plano A1">Plano A1</option>
            <option value="Plano A0">Plano A0</option>
          </select>
        </div>

        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Tipo de escaneo
          </label>
          <div className="chips">
            <button
              type="button"
              className={`chip text-[11px] py-1.5 ${colorMode === "bn" ? "chip-active" : ""}`}
              onClick={() => update({ scanColorMode: "bn" })}
            >
              Blanco y negro
            </button>
            <button
              type="button"
              className={`chip text-[11px] py-1.5 ${colorMode === "color" ? "chip-active" : ""}`}
              onClick={() => update({ scanColorMode: "color" })}
            >
              Color
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            El precio es el mismo para B&N y color.
          </p>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Cantidad de originales (aprox.)
          </label>
          <input
            type="number"
            min={1}
            className="input h-9 py-1.5 text-[13px]"
            placeholder="Ej. 80"
            value={opts.scanQtyApprox || ""}
            onChange={(e) =>
              update({ scanQtyApprox: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </div>

        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Caras a escanear
          </label>
          <select
            className="select text-[13px] h-9 py-1.5"
            value={duplex}
            onChange={(e) => update({ scanDuplex: e.target.value })}
          >
            <option value="simple">Solo frente</option>
            <option value="dorso">Frente y vuelta</option>
          </select>
          {duplex === "dorso" && (
            <p className="text-[10px] text-slate-400 mt-1">
              Frente y vuelta = {qty} originales × 2 caras = {effectiveQty} escaneos.
            </p>
          )}
        </div>
      </div>

      <div className="h-px bg-white/10" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Resolución (dpi)
          </label>
          <select
            className="select text-[13px] h-9 py-1.5"
            value={dpi}
            onChange={(e) => update({ scanDpi: e.target.value })}
          >
            <option value="150">150 dpi (rápido / texto)</option>
            <option value="300">300 dpi (recomendado)</option>
            <option value="600">600 dpi (alta calidad)</option>
          </select>
        </div>

        <div>
          <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
            Entrega de archivos
          </label>
          <select
            className="select text-[13px] h-9 py-1.5"
            value={output}
            onChange={(e) => update({ scanOutput: e.target.value })}
          >
            <option value="pdf-unico">PDF único con todas las páginas</option>
            <option value="pdf-por-hoja">PDF por cada original</option>
            <option value="jpg">Imágenes JPG individuales</option>
          </select>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      <div>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Forma de entrega
        </label>
        <select
          className="select text-[13px] h-9 py-1.5"
          value={delivery}
          onChange={(e) => update({ scanDelivery: e.target.value })}
        >
          <option value="correo">Por correo electrónico</option>
          <option value="usb">En USB del cliente</option>
          <option value="nube">Subir a Drive / WeTransfer</option>
          <option value="otro">Otro (especificar en notas)</option>
        </select>

        {delivery === "correo" && (
          <input
            className="input mt-2 h-9 py-1.5 text-[13px]"
            placeholder="Correo donde enviaremos los archivos"
            value={opts.scanEmail || ""}
            onChange={(e) => update({ scanEmail: e.target.value })}
          />
        )}
      </div>

      {/* ── Precio estimado ────────────────────────────────────── */}
      <div className="h-px bg-white/10" />

      <div className="rounded-xl bg-emerald-950/60 border border-emerald-700/40 px-4 py-3 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400/80">
          Precio estimado
        </p>

        <div className="space-y-1 text-[12px] text-slate-300/90">
          <div className="flex justify-between">
            <span>Tamaño</span>
            <span className="font-medium text-white">{sizeLabel}</span>
          </div>
          <div className="flex justify-between">
            <span>Precio por escaneo</span>
            <span className="font-medium text-white tabular-nums">
              ${fmtMXN(priceResult.unit)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>
              Escaneos
              {duplex === "dorso" ? ` (${qty} orig. × 2 caras)` : ""}
            </span>
            <span className="font-medium text-white tabular-nums">× {effectiveQty}</span>
          </div>
        </div>

        <div className="h-px bg-white/10 mt-1" />

        <div className="flex items-end justify-between gap-3">
          <p className="text-[10px] text-slate-500 max-w-[180px]">
            El precio varía según la cantidad total de escaneos. Solo el tamaño y la cantidad afectan el costo.
          </p>
          <span className="text-[28px] font-bold text-emerald-400 tabular-nums leading-none shrink-0">
            ${fmtMXN(priceResult.total)}
          </span>
        </div>

        <p className="text-[10px] text-slate-500">
          * Estimación basada en lista de precios 2026. El total se confirma antes de escanear.
        </p>
      </div>

      <div className="h-px bg-white/10" />

      <div>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Notas para este trabajo de escaneo
        </label>
        <textarea
          className="input min-h-[70px] text-[13px] py-2"
          placeholder="Ej. separar por carpetas, nombrar por nivel, enviar por correo y copiar a USB..."
          value={opts.scanNotes || ""}
          onChange={(e) => update({ scanNotes: e.target.value })}
        />
      </div>
    </div>
  );
}
