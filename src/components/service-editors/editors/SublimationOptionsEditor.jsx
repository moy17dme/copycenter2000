// src/components/service-editors/editors/SublimationOptionsEditor.jsx
import { useMemo, useRef } from "react";
import GamesQtyField from "./_shared/GamesQtyField";
import { SUBLIMACION, lookupPrice } from "../../../data/priceList";

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Productos con precio definido en la lista de precios
const PRICED_PRODUCTS = ["taza-blanca", "taza-magica", "termo-metalico", "playera"];

function getProductPriceTable(productType) {
  switch (productType) {
    case "taza-blanca":   return SUBLIMACION.taza;
    case "taza-magica":   return SUBLIMACION.tazaMagica;
    case "termo-metalico": return SUBLIMACION.termo;
    default: return null;
  }
}

export default function SublimationOptionsEditor({ opts, onChangeOptions }) {
  const update = (patch) => onChangeOptions({ ...patch });

  const productType = opts.subProductType || "";
  const baseColor = opts.subBaseColor || "";
  const printArea = opts.subPrintArea || "";
  const rush = !!opts.subRush;

  const dueDate = opts.subDueDate || "";
  const notes = opts.subNotes || "";

  const sizeNino = opts.subSizeNino ?? "";
  const sizeCH = opts.subSizeCH ?? "";
  const sizeM = opts.subSizeM ?? "";
  const sizeG = opts.subSizeG ?? "";
  const sizeXL = opts.subSizeXL ?? "";

  const minDate = useMemo(() => todayISO(), []);
  const dateRef = useRef(null);

  const openDatePicker = () => {
    if (dateRef.current?.showPicker) dateRef.current.showPicker();
  };

  const gamesQty = Number(opts.gamesQty ?? opts.subQty ?? 1);

  // ── Cálculo de precio estimado ──────────────────────────────────────────────
  const priceInfo = useMemo(() => {
    if (!productType || gamesQty < 1) return null;

    if (productType === "playera") {
      const nino = Number(sizeNino) || 0;
      const ch   = Number(sizeCH)   || 0;
      const m    = Number(sizeM)    || 0;
      const g    = Number(sizeG)    || 0;
      const xl   = Number(sizeXL)   || 0;
      const sizeTotal = nino + ch + m + g + xl;

      // Si no hay desglose, usar gamesQty con precio de playera chica como referencia
      if (sizeTotal === 0) {
        const perUnit = lookupPrice(SUBLIMACION.playeraChica, gamesQty);
        if (perUnit === null) return null;
        return {
          type: "playera-approx",
          qty: gamesQty,
          perUnit,
          total: perUnit * gamesQty,
        };
      }

      // Con desglose: usar sizeTotal como referencia de cantidad para el tier
      const refQty = sizeTotal;
      const pNino = lookupPrice(SUBLIMACION.playeraNino,    refQty) ?? 0;
      const pCH   = lookupPrice(SUBLIMACION.playeraChica,   refQty) ?? 0;
      const pM    = lookupPrice(SUBLIMACION.playeraMediana, refQty) ?? 0;
      const pG    = lookupPrice(SUBLIMACION.playeraGrande,  refQty) ?? 0;

      const total =
        nino * pNino +
        ch   * pCH   +
        m    * pM    +
        (g + xl) * pG;

      return {
        type: "playera-breakdown",
        qty: sizeTotal,
        breakdown: { nino, ch, m, g, xl, pNino, pCH, pM, pG },
        total,
      };
    }

    const table = getProductPriceTable(productType);
    if (!table) return null;
    const perUnit = lookupPrice(table, gamesQty);
    if (perUnit === null) return null;

    return {
      type: "simple",
      qty: gamesQty,
      perUnit,
      total: perUnit * gamesQty,
    };
  }, [productType, gamesQty, sizeNino, sizeCH, sizeM, sizeG, sizeXL]);

  // ── Validación ──────────────────────────────────────────────────────────────
  const missing = useMemo(() => {
    const m = {
      productType: !productType,
      baseColor: !baseColor,
      printArea: !printArea,
      dueDate: !dueDate,
      gamesQty: !(gamesQty >= 1),
      otherNeedsNotes: productType === "otro" && !notes.trim(),
    };
    return m;
  }, [productType, baseColor, printArea, dueDate, gamesQty, notes]);

  const hasMissing = Object.values(missing).some(Boolean);

  const fieldRing = (isMissing) =>
    isMissing ? "ring-1 ring-red-400/70 border-red-400/40" : "";

  return (
    <div className="space-y-5 text-[13px] leading-snug">
      {hasMissing && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
          ⚠️ Debes llenar todas las opciones para poder procesar tu pedido correctamente.
          {missing.otherNeedsNotes && (
            <div className="mt-1 text-[11px] text-amber-200/90">
              *Si eliges "Otro", especifica el producto en notas.
            </div>
          )}
        </div>
      )}

      {/* Producto */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Producto a personalizar
        </label>

        <select
          className={`select text-[13px] h-9 py-1.5 ${fieldRing(missing.productType)}`}
          value={productType || "taza-blanca"}
          onChange={(e) => update({ subProductType: e.target.value })}
        >
          <option value="taza-blanca">Taza blanca 11 oz</option>
          <option value="taza-magica">Taza mágica</option>
          <option value="termo-metalico">Termo metálico</option>
          <option value="playera">Playera poliéster</option>
          <option value="cojin">Cojín</option>
          <option value="mousepad">Mousepad</option>
          <option value="rompecabezas">Rompecabezas</option>
          <option value="otro">Otro (especificar en notas)</option>
        </select>
      </section>

      <div className="h-px bg-white/10" />

      {/* Color base */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Color / tipo de base
        </label>

        <div className="chips flex flex-wrap gap-2">
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${baseColor === "blanco" ? "chip-active" : ""}`}
            onClick={() => update({ subBaseColor: "blanco" })}
          >
            Blanco
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${baseColor === "negro" ? "chip-active" : ""}`}
            onClick={() => update({ subBaseColor: "negro" })}
          >
            Negro
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${baseColor === "color" ? "chip-active" : ""}`}
            onClick={() => update({ subBaseColor: "color" })}
          >
            Color
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${baseColor === "metalico" ? "chip-active" : ""}`}
            onClick={() => update({ subBaseColor: "metalico" })}
          >
            Metálico / acero
          </button>
        </div>

        <p className="mt-1 text-[11px] text-slate-400">
          Si necesitas un color específico, acláralo en las notas.
        </p>

        {/* Juegos / cantidad */}
        <div className={missing.gamesQty ? "mt-1" : ""}>
          <div className={missing.gamesQty ? "rounded-lg p-1 ring-1 ring-red-400/60" : ""}>
            <GamesQtyField opts={opts} onChangeOptions={onChangeOptions} />
          </div>
        </div>
      </section>

      {/* Playera: tallas (opcional) */}
      {productType === "playera" && (
        <>
          <div className="h-px bg-white/10" />

          <section>
            <span className="text-[11px] uppercase tracking-[0.16em] text-slate-300/80">
              Desglose por tallas (opcional)
            </span>

            <div className="mt-2 grid grid-cols-5 gap-2 text-[11px]">
              <div>
                <p className="text-slate-400 mb-1">Niño</p>
                <input
                  type="number"
                  min={0}
                  className="input h-8 py-1 text-[12px]"
                  value={sizeNino}
                  onChange={(e) => update({ subSizeNino: Math.max(0, Number(e.target.value) || 0) })}
                />
              </div>
              <div>
                <p className="text-slate-400 mb-1">CH</p>
                <input
                  type="number"
                  min={0}
                  className="input h-8 py-1 text-[12px]"
                  value={sizeCH}
                  onChange={(e) => update({ subSizeCH: Math.max(0, Number(e.target.value) || 0) })}
                />
              </div>
              <div>
                <p className="text-slate-400 mb-1">M</p>
                <input
                  type="number"
                  min={0}
                  className="input h-8 py-1 text-[12px]"
                  value={sizeM}
                  onChange={(e) => update({ subSizeM: Math.max(0, Number(e.target.value) || 0) })}
                />
              </div>
              <div>
                <p className="text-slate-400 mb-1">G</p>
                <input
                  type="number"
                  min={0}
                  className="input h-8 py-1 text-[12px]"
                  value={sizeG}
                  onChange={(e) => update({ subSizeG: Math.max(0, Number(e.target.value) || 0) })}
                />
              </div>
              <div>
                <p className="text-slate-400 mb-1">XL</p>
                <input
                  type="number"
                  min={0}
                  className="input h-8 py-1 text-[12px]"
                  value={sizeXL}
                  onChange={(e) => update({ subSizeXL: Math.max(0, Number(e.target.value) || 0) })}
                />
              </div>
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              Si no estás seguro de las tallas, lo definimos al confirmar.
            </p>
          </section>
        </>
      )}

      <div className="h-px bg-white/10" />

      {/* Área de impresión */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Área de impresión
        </label>

        <div className={`chips flex flex-wrap gap-2 ${fieldRing(missing.printArea)}`}>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${printArea === "frente" ? "chip-active" : ""}`}
            onClick={() => update({ subPrintArea: "frente" })}
          >
            Solo frente
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${printArea === "frente-vuelta" ? "chip-active" : ""}`}
            onClick={() => update({ subPrintArea: "frente-vuelta" })}
          >
            Frente y vuelta
          </button>
          <button
            type="button"
            className={`chip text-[11px] py-1.5 ${printArea === "full" ? "chip-active" : ""}`}
            onClick={() => update({ subPrintArea: "full" })}
          >
            Full print (si aplica)
          </button>
        </div>

        <p className="mt-1 text-[11px] text-slate-400">
          El área disponible depende del producto; si hay duda lo ajustamos al revisar tu archivo.
        </p>
      </section>

      <div className="h-px bg-white/10" />

      {/* Precio estimado */}
      {priceInfo && PRICED_PRODUCTS.includes(productType) && (
        <section>
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-3 space-y-1.5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300/80">
              Precio estimado
            </p>

            {priceInfo.type === "simple" && (
              <p className="text-[13px] text-slate-200">
                <span className="text-slate-400">
                  {priceInfo.qty} pza{priceInfo.qty !== 1 ? "s" : ""} × ${priceInfo.perUnit.toFixed(2)} c/u ={" "}
                </span>
                <span className="font-semibold text-emerald-300">
                  ${priceInfo.total.toFixed(2)}
                </span>
              </p>
            )}

            {priceInfo.type === "playera-approx" && (
              <p className="text-[13px] text-slate-200">
                <span className="text-slate-400">
                  {priceInfo.qty} pza{priceInfo.qty !== 1 ? "s" : ""} × ${priceInfo.perUnit.toFixed(2)} c/u ≈{" "}
                </span>
                <span className="font-semibold text-emerald-300">
                  ${priceInfo.total.toFixed(2)}
                </span>
                <span className="ml-1 text-[11px] text-slate-400">
                  (precio para talla CH/M/G; llena el desglose para precio exacto)
                </span>
              </p>
            )}

            {priceInfo.type === "playera-breakdown" && (
              <div className="space-y-0.5 text-[12px] text-slate-200">
                {priceInfo.breakdown.nino > 0 && (
                  <p>
                    Niño ×{priceInfo.breakdown.nino}:{" "}
                    <span className="text-slate-300">
                      ${(priceInfo.breakdown.nino * priceInfo.breakdown.pNino).toFixed(2)}
                    </span>
                    <span className="text-slate-500 ml-1">(${priceInfo.breakdown.pNino.toFixed(2)} c/u)</span>
                  </p>
                )}
                {priceInfo.breakdown.ch > 0 && (
                  <p>
                    CH ×{priceInfo.breakdown.ch}:{" "}
                    <span className="text-slate-300">
                      ${(priceInfo.breakdown.ch * priceInfo.breakdown.pCH).toFixed(2)}
                    </span>
                    <span className="text-slate-500 ml-1">(${priceInfo.breakdown.pCH.toFixed(2)} c/u)</span>
                  </p>
                )}
                {priceInfo.breakdown.m > 0 && (
                  <p>
                    M ×{priceInfo.breakdown.m}:{" "}
                    <span className="text-slate-300">
                      ${(priceInfo.breakdown.m * priceInfo.breakdown.pM).toFixed(2)}
                    </span>
                    <span className="text-slate-500 ml-1">(${priceInfo.breakdown.pM.toFixed(2)} c/u)</span>
                  </p>
                )}
                {(priceInfo.breakdown.g > 0 || priceInfo.breakdown.xl > 0) && (
                  <p>
                    G/XL ×{priceInfo.breakdown.g + priceInfo.breakdown.xl}:{" "}
                    <span className="text-slate-300">
                      ${((priceInfo.breakdown.g + priceInfo.breakdown.xl) * priceInfo.breakdown.pG).toFixed(2)}
                    </span>
                    <span className="text-slate-500 ml-1">(${priceInfo.breakdown.pG.toFixed(2)} c/u)</span>
                  </p>
                )}
                <div className="pt-1 border-t border-white/10 flex justify-between items-center">
                  <span className="text-slate-400">Total ({priceInfo.qty} pzas)</span>
                  <span className="font-semibold text-emerald-300 text-[14px]">
                    ${priceInfo.total.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-400/80">
              * Precio orientativo. El total final se confirma al procesar tu pedido.
            </p>
          </div>
        </section>
      )}

      {/* Productos sin precio definido */}
      {productType && !PRICED_PRODUCTS.includes(productType) && (
        <section>
          <div className="rounded-xl border border-slate-600/40 bg-slate-700/20 px-3 py-2 text-[12px] text-slate-400">
            El precio de este producto se cotiza al revisar tu pedido.
          </div>
        </section>
      )}

      <div className="h-px bg-white/10" />

      {/* Fecha deseada */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Fecha deseada de entrega
        </label>

        <input
          ref={dateRef}
          type="date"
          min={minDate}
          className={`input h-9 py-1.5 text-[13px] ${fieldRing(missing.dueDate)}`}
          value={dueDate}
          onChange={(e) => update({ subDueDate: e.target.value })}
          inputMode="none"
          onKeyDown={(e) => {
            if (e.key !== "Tab") e.preventDefault();
          }}
          onPaste={(e) => e.preventDefault()}
          onClick={openDatePicker}
          onFocus={openDatePicker}
        />

        <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-200/90">
          <input
            id="subRush"
            type="checkbox"
            checked={rush}
            onChange={(e) => update({ subRush: e.target.checked })}
          />
          <label htmlFor="subRush">
            Es un pedido urgente (te confirmamos si es posible en el horario solicitado).
          </label>
        </div>
      </section>

      <div className="h-px bg-white/10" />

      {/* Notas / mensaje */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Notas / mensaje para el pedido
        </label>

        <textarea
          className={`input min-h-[90px] py-2 text-[13px] ${fieldRing(missing.otherNeedsNotes)}`}
          placeholder='Ej: "Quiero 2 tazas con nombres distintos", "Envío mi logo", "Otro: termo de 20oz"...'
          value={notes}
          onChange={(e) => update({ subNotes: e.target.value })}
        />

        <p className="mt-1 text-[11px] text-slate-400">
          Si elegiste "Otro", aquí debes especificar el producto.
        </p>
      </section>
    </div>
  );
}
