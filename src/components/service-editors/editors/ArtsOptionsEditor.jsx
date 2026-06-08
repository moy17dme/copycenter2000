// ArtsOptionsEditor.jsx — Impresión Offset (por millar)
// Precios por millar +50% según lista "Impresos Comerciales PRECIOS.xlsx"

// ─── Tabla de precios por material ──────────────────────────────────────────
const MAT = {
  "eco-115": {
    label: "Couché 115 g · ECO",
    desc: "Couché estándar, acabado liso",
    modes: [
      { key: "4x1", label: "4×1 — Frente full color, reverso 1 tinta" },
      { key: "4x4", label: "4×4 — Ambas caras full color" },
    ],
    finish: null,
    formats: [
      { key: "v1/4",  label: "1/4 carta  ≈ 9.7 × 13.6 cm",   "4x1": 315,   "4x4": 390   },
      { key: "v1/2",  label: "1/2 carta  ≈ 19.7 × 13.6 cm",  "4x1": 630,   "4x4": 780   },
      { key: "carta", label: "Carta  ≈ 19.7 × 27.5 cm",       "4x1": 1260,  "4x4": 1560  },
      { key: "oficio",label: "Oficio  ≈ 19.7 × 35.5 cm",      "4x1": 1440,  "4x4": 1935  },
      { key: "tab",   label: "Tabloide  ≈ 39.7 × 27.5 cm",    "4x1": 2520,  "4x4": 3120  },
      { key: "4c",    label: "4 Cartas  ≈ 55.3 × 39.7 cm",    "4x1": 5040,  "4x4": 6240  },
      { key: "8c",    label: "8 Cartas  ≈ 79.7 × 55.3 cm",    "4x1": 10080, "4x4": 12480 },
      { key: "full",  label: "Full Max  ≈ 100 × 68 cm",        "4x1": 14775, "4x4": 18015 },
    ],
  },
  "gold-150": {
    label: "Couché 150 g · GOLD",
    desc: "Mayor gramaje, colores más saturados",
    modes: [
      { key: "4x1", label: "4×1 — Frente full color, reverso 1 tinta" },
      { key: "4x4", label: "4×4 — Ambas caras full color" },
    ],
    finish: null,
    formats: [
      { key: "v1/4",  label: "1/4 carta  ≈ 9.7 × 14 cm",    "4x1": 375,   "4x4": 450   },
      { key: "v1/2",  label: "1/2 carta  ≈ 21.5 × 14 cm",   "4x1": 750,   "4x4": 900   },
      { key: "carta", label: "Carta  ≈ 21.5 × 28 cm",        "4x1": 1500,  "4x4": 1800  },
      { key: "oficio",label: "Oficio  ≈ 21.5 × 35.5 cm",     "4x1": 1875,  "4x4": 2325  },
      { key: "tab",   label: "Tabloide  ≈ 43 × 28 cm",        "4x1": 3000,  "4x4": 3600  },
      { key: "4c",    label: "4 Cartas  ≈ 56 × 43 cm",        "4x1": 6000,  "4x4": 7200  },
      { key: "8c",    label: "8 Cartas  ≈ 86 × 56 cm",        "4x1": 12000, "4x4": 14400 },
      { key: "full",  label: "Full Max  ≈ 100 × 68 cm",        "4x1": 15525, "4x4": 18810 },
    ],
  },
  "couche-300": {
    label: "Couché 300 g · Tarjetas / Postales",
    desc: "Cartulina premium, acabado profesional",
    modes: [
      { key: "4x4", label: "4×4 — Full color ambas caras" },
    ],
    finish: [
      { key: "barnizado",  label: "Barnizado" },
      { key: "laminado",   label: "Laminado" },
      { key: "barniz-reg", label: "Barniz a Registro" },
    ],
    formats: [
      { key: "mini-tarj",    label: "Mini Tarjeta  ≈ 8.2 × 4.4 cm",   barnizado: 240,   laminado: 352.5, "barniz-reg": 615   },
      { key: "tarjeta",      label: "Tarjeta  ≈ 9 × 4.8 cm",           barnizado: 270,   laminado: 420,   "barniz-reg": 720   },
      { key: "mini-postal",  label: "Mini Postal  ≈ 9.8 × 9 cm",       barnizado: 450,   laminado: 720,   "barniz-reg": 1275  },
      { key: "separador",    label: "Separador  ≈ 18 × 4.8 cm",        barnizado: 450,   laminado: 720,   "barniz-reg": 1275  },
      { key: "postal-chica", label: "Postal Chica  ≈ 14.8 × 9 cm",     barnizado: 630,   laminado: 1035,  "barniz-reg": 1875  },
      { key: "postal-grande",label: "Postal Grande  ≈ 18 × 9.8 cm",    barnizado: 810,   laminado: 1350,  "barniz-reg": 2475  },
      { key: "postal-1/4",   label: "Postal 1/4  ≈ 10.5 × 14 cm",     barnizado: 990,   laminado: 1665,  "barniz-reg": 3225  },
      { key: "postal-1/2",   label: "Postal 1/2  ≈ 21.5 × 14 cm",     barnizado: 1650,  laminado: 2730,  "barniz-reg": 5400  },
      { key: "postal-carta", label: "Postal Carta  ≈ 21.5 × 28 cm",    barnizado: 3300,  laminado: 5460,  "barniz-reg": 10800 },
      { key: "oficio",       label: "Oficio  ≈ 21.5 × 35.5 cm",        barnizado: 3750,  laminado: 6390,  "barniz-reg": 12675 },
      { key: "tabloide",     label: "Tabloide  ≈ 43 × 28 cm",           barnizado: 6600,  laminado: 10920, "barniz-reg": 21600 },
      { key: "4-cartas",     label: "4 Cartas  ≈ 56 × 43 cm",           barnizado: 11250, laminado: 20250, "barniz-reg": 39450 },
    ],
  },
  "bond-75": {
    label: "Bond 75 g · Volante Económico",
    desc: "Papel bond, impresión un solo frente",
    modes: [
      { key: "4x0", label: "4×0 — Solo frente full color" },
    ],
    finish: null,
    formats: [
      { key: "v1/4",  label: "1/4 carta  ≈ 9.7 × 13.6 cm",  "4x0": 330  },
      { key: "v1/2",  label: "1/2 carta  ≈ 19.7 × 13.6 cm", "4x0": 660  },
      { key: "carta", label: "Carta  ≈ 19.7 × 27.5 cm",      "4x0": 1320 },
      { key: "oficio",label: "Oficio  ≈ 19.7 × 35.5 cm",     "4x0": 1425 },
      { key: "tab",   label: "Tabloide  ≈ 39.7 × 27.5 cm",   "4x0": 2490 },
      { key: "4c",    label: "4 Cartas  ≈ 55.3 × 39.7 cm",   "4x0": 4980 },
      { key: "8c",    label: "8 Cartas  ≈ 79.7 × 55.3 cm",   "4x0": 9960 },
    ],
  },
  "adhesivo-90": {
    label: "Adhesivo 90 g · Etiquetas",
    desc: "Material adhesivo para alta tirada",
    modes: [
      { key: "4x0", label: "4×0 — Frente full color" },
    ],
    finish: null,
    formats: [
      { key: "carta",  label: "Carta  ≈ 21.5 × 28 cm",  "4x0": 3825  },
      { key: "tab",    label: "Tabloide  ≈ 43 × 28 cm",  "4x0": 6150  },
      { key: "4c",     label: "4 Cartas  ≈ 56 × 43 cm",  "4x0": 12300 },
    ],
  },
  "folder": {
    label: "Folder / Carpeta",
    desc: "Carpetas corporativas con bolsillos",
    modes: [],
    finish: null,
    formats: [
      { key: "carta-barn",  label: "Carta — Barnizado 4×1",           price: 11700 },
      { key: "carta-lam",   label: "Carta — Laminado 4×4",            price: 18750 },
      { key: "carta-reg",   label: "Carta — Barniz a Registro 4×4",   price: 22500 },
      { key: "oficio-barn", label: "Oficio — Barnizado 4×1",          price: 14250 },
      { key: "oficio-lam",  label: "Oficio — Laminado 4×4",           price: 22950 },
      { key: "oficio-reg",  label: "Oficio — Barniz a Registro 4×4",  price: 27750 },
    ],
  },
};

const ACABADOS = [
  { key: "diptico",     label: "Díptico (doblez)",     price: 150 },
  { key: "triptico",    label: "Tríptico (doblez)",    price: 150 },
  { key: "cuadriptico", label: "Cuadríptico (doblez)", price: 375 },
  { key: "foliado",     label: "Foliado",              price: 150 },
  { key: "engomado",    label: "Engomado en blocs",    price: 75  },
  { key: "perforado",   label: "Perforado 3/6/9 mm",  price: 150 },
];

// ─── Utilidad de precio ──────────────────────────────────────────────────────
export function calcOffsetPrice(opts) {
  const matDef = MAT[opts.offMaterial];
  if (!matDef) return null;
  const fmt = matDef.formats.find((f) => f.key === opts.offFormat);
  if (!fmt) return null;
  const millares = Math.max(1, Number(opts.offMillares || 1));

  let basePerMillar = null;
  if (opts.offMaterial === "folder") {
    basePerMillar = fmt.price ?? null;
  } else if (opts.offMaterial === "couche-300") {
    const finish = opts.offFinish || "barnizado";
    basePerMillar = fmt[finish] ?? null;
  } else {
    const mode = opts.offColorMode || matDef.modes[0]?.key;
    basePerMillar = fmt[mode] ?? null;
  }
  if (basePerMillar === null) return null;

  const acabados = Array.isArray(opts.offAcabados) ? opts.offAcabados : [];
  const acabadosExtra = acabados.reduce((s, ak) => {
    const a = ACABADOS.find((x) => x.key === ak);
    return s + (a?.price || 0);
  }, 0);

  const totalPerMillar = basePerMillar + acabadosExtra;
  const total = totalPerMillar * millares;
  return {
    total,
    perUnit: totalPerMillar,
    qty: millares,
    label: `${millares} millar${millares !== 1 ? "es" : ""}`,
  };
}

// ─── Componente ──────────────────────────────────────────────────────────────
export default function ArtsOptionsEditor({ opts, onChangeOptions }) {
  const update = (patch) => onChangeOptions({ ...patch });

  const material  = opts.offMaterial  || "eco-115";
  const matDef    = MAT[material];
  const format    = opts.offFormat    || matDef.formats[0]?.key || "";
  const colorMode = opts.offColorMode || matDef.modes[0]?.key  || "";
  const finish    = opts.offFinish    || matDef.finish?.[0]?.key || "barnizado";
  const millares  = opts.offMillares  || 1;
  const acabados  = Array.isArray(opts.offAcabados) ? opts.offAcabados : [];

  const handleMaterial = (val) => {
    const def = MAT[val];
    update({
      offMaterial:  val,
      offFormat:    def.formats[0]?.key || "",
      offColorMode: def.modes[0]?.key   || "",
      offFinish:    def.finish?.[0]?.key || "barnizado",
    });
  };

  const toggleAcabado = (key) => {
    const next = acabados.includes(key)
      ? acabados.filter((k) => k !== key)
      : [...acabados, key];
    update({ offAcabados: next });
  };

  const price = calcOffsetPrice({ ...opts, offMaterial: material, offFormat: format, offColorMode: colorMode, offFinish: finish, offMillares: millares, offAcabados: acabados });

  const fmt = (n) => n?.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const piezasTotal = millares * 1000;

  return (
    <div className="space-y-4 text-[13px] leading-snug">

      {/* ── Aviso: distinción vs Impresión Digital ──────── */}
      <div className="rounded-2xl px-4 py-3 text-[12px] space-y-2"
        style={{ background: "rgba(79,123,218,0.07)", border: "1px solid rgba(79,123,218,0.25)" }}>
        <p className="font-semibold" style={{ color: "#93C5FD" }}>
          Impresos Comerciales — Impresión Offset
        </p>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-xl px-3 py-2" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <p className="font-semibold mb-1" style={{ color: "#FDE047" }}>Este servicio</p>
            <p style={{ color: "#D4B94A" }}>Mín. 1,000 piezas por pedido</p>
            <p style={{ color: "#D4B94A" }}>Un solo diseño para todas</p>
            <p style={{ color: "#D4B94A" }}>Couché / bond / adhesivo</p>
            <p style={{ color: "#D4B94A" }}>Precio fijo por millar</p>
          </div>
          <div className="rounded-xl px-3 py-2" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <p className="font-semibold mb-1" style={{ color: "#34D399" }}>Impresión Digital</p>
            <p style={{ color: "#6EE7B7" }}>Desde 1 pieza, sin mínimo</p>
            <p style={{ color: "#6EE7B7" }}>Cada pieza puede ser diferente</p>
            <p style={{ color: "#6EE7B7" }}>Entrega más rápida</p>
            <p style={{ color: "#6EE7B7" }}>Precio por pieza</p>
          </div>
        </div>
        {millares < 1 && (
          <p className="text-[11px]" style={{ color: "#93C5FD" }}>
            Si necesitas menos de 1,000 piezas, usa <strong>Impresión Digital</strong>.
          </p>
        )}
      </div>

      <div className="h-px bg-white/10" />

      {/* Material */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-2">
          Material / papel
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(MAT).map(([k, m]) => (
            <button
              key={k}
              type="button"
              onClick={() => handleMaterial(k)}
              className={`rounded-xl px-3 py-2 text-left transition-all text-[11px] leading-tight ${
                material === k
                  ? "bg-blue-700/30 border border-blue-500/60 text-white"
                  : "border border-white/10 text-slate-300 hover:border-white/25"
              }`}
            >
              <span className="font-medium block">{m.label}</span>
              <span className="text-slate-400 text-[10px]">{m.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="h-px bg-white/10" />

      {/* Formato */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Formato / tamaño
        </label>
        <select
          className="select text-[13px] h-9 py-1.5"
          value={format}
          onChange={(e) => update({ offFormat: e.target.value })}
        >
          {matDef.formats.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </section>

      {/* Modo de color (no aplica a folder) */}
      {material !== "folder" && matDef.modes.length > 1 && (
        <>
          <div className="h-px bg-white/10" />
          <section>
            <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
              Modo de impresión
            </label>
            <div className="flex flex-wrap gap-2">
              {matDef.modes.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`chip text-[11px] py-1.5 ${colorMode === m.key ? "chip-active" : ""}`}
                  onClick={() => update({ offColorMode: m.key })}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
      {material !== "folder" && matDef.modes.length === 1 && (
        <p className="text-[11px] text-slate-400 -mt-2">
          Modo: <span className="text-slate-300">{matDef.modes[0].label}</span>
        </p>
      )}

      {/* Acabado para Couché 300g */}
      {matDef.finish && (
        <>
          <div className="h-px bg-white/10" />
          <section>
            <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
              Tipo de acabado
            </label>
            <div className="flex flex-wrap gap-2">
              {matDef.finish.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`chip text-[11px] py-1.5 ${finish === f.key ? "chip-active" : ""}`}
                  onClick={() => update({ offFinish: f.key })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="h-px bg-white/10" />

      {/* Cantidad en millares */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Cantidad (millares · 1 millar = 1,000 piezas)
        </label>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 flex-wrap">
            {[1, 2, 3, 5, 10].map((n) => (
              <button
                key={n}
                type="button"
                className={`chip text-[11px] py-1 px-2.5 ${millares === n ? "chip-active" : ""}`}
                onClick={() => update({ offMillares: n })}
              >
                {n}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            className="input h-8 py-1 text-[12px] w-20 text-center"
            value={millares}
            onChange={(e) => update({ offMillares: Math.max(1, Number(e.target.value) || 1) })}
          />
          <span className="text-slate-400 text-[11px]">millares</span>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          {(millares * 1000).toLocaleString("es-MX")} piezas en total
        </p>
      </section>

      <div className="h-px bg-white/10" />

      {/* Acabados adicionales */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-2">
          Acabados adicionales <span className="normal-case text-slate-500">(precio por millar)</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {ACABADOS.map((a) => {
            const active = acabados.includes(a.key);
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => toggleAcabado(a.key)}
                className={`rounded-xl px-3 py-2 text-left transition-all text-[11px] leading-tight ${
                  active
                    ? "bg-blue-700/30 border border-blue-500/60 text-white"
                    : "border border-white/10 text-slate-300 hover:border-white/25"
                }`}
              >
                <span className="block font-medium">{a.label}</span>
                <span className="text-slate-400 text-[10px]">+${a.price.toLocaleString("es-MX")}/millar</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Resumen de precio */}
      {price && (
        <>
          <div className="h-px bg-white/10" />
          <div
            className="rounded-2xl px-4 py-3 text-[12px]"
            style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: "#6EE7B7" }}>Por millar</p>
                <p className="font-bold tabular-nums text-sm" style={{ color: "#F5F7FA" }}>
                  ${fmt(price.perUnit)}
                </p>
              </div>
              <div className="text-right">
                <p style={{ color: "#6EE7B7" }}>Total ({millares} millar{millares !== 1 ? "es" : ""})</p>
                <p className="font-bold tabular-nums text-xl" style={{ color: "#34D399" }}>
                  ${fmt(price.total)}
                </p>
              </div>
            </div>
            <p className="mt-1.5" style={{ color: "#6B7280" }}>
              {(millares * 1000).toLocaleString("es-MX")} piezas · mismo diseño · impresión offset
            </p>
          </div>
        </>
      )}

      <div className="h-px bg-white/10" />

      {/* Notas */}
      <section>
        <label className="label text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
          Notas / referencias <span className="normal-case text-slate-500">(opcional)</span>
        </label>
        <textarea
          className="input min-h-[70px] py-2 text-[13px]"
          placeholder="Ej. requiere troquel especial, pantones específicos, fecha de entrega, etc."
          value={opts.offNotes || ""}
          onChange={(e) => update({ offNotes: e.target.value })}
        />
      </section>
    </div>
  );
}
