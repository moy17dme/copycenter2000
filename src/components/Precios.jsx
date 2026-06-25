import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Camera,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Coffee,
  CreditCard,
  Newspaper,
  Palette,
  Printer,
  Ruler,
  Scissors,
} from "lucide-react";

const SERVICIOS_PRECIOS = [
  {
    id: "copias",
    titulo: "Copias B/N",
    icon: "🖨️",
    color: "blue",
    desde: "$1.00 carta (1-99)",
    tabla: [
      { label: "1-99 hojas", items: ["Carta $1.00", "Oficio $1.50", "Doble carta $3.00"] },
      { label: "100-499 hojas", items: ["Carta $0.90", "Oficio $1.00", "Doble carta $2.50"] },
      { label: "500-999 hojas", items: ["Carta $0.80", "Oficio $0.90", "Doble carta $2.00"] },
      { label: "1,000-4,999 hojas", items: ["Carta $0.70", "Oficio $0.80", "Doble carta $1.80"] },
      { label: "10,000+ hojas", items: ["Carta $0.70", "Oficio $0.80", "Doble carta $1.47"] },
    ],
    extras: ["Engargolado desde $22", "Enmicado disponible"],
  },
  {
    id: "acabados",
    titulo: "Engargolado / Enmicado",
    icon: "📌",
    color: "cyan",
    desde: "$14.00",
    tabla: [
      { label: "Engargolado metalico", items: ["1-45 pags $25", "46-85 pags $30", "181-280 pags $40"] },
      { label: "Engargolado plastico", items: ["0-30 pags $22", "111-140 pags $26", "451-500 pags $50"] },
      { label: "Enmicado 1-10 pzas", items: ["Carta $20", "Oficio $30", "Doble carta $45"] },
      { label: "Enmicado 21+ pzas", items: ["Carta $14", "Oficio $17", "Doble carta $25"] },
    ],
    extras: ["Pastas y micas segun disponibilidad", "Precio por pieza o documento"],
  },
  {
    id: "impresion",
    titulo: "Impresión Color",
    icon: "🎨",
    color: "orange",
    desde: "$1.80",
    tabla: [
      { label: "Bond - Inyeccion", items: ["Carta desde $1.80", "Oficio desde $2.50", "Doble carta desde $9.50"] },
      { label: "Bond - Laser", items: ["Carta desde $5.50", "Oficio desde $7.00", "Doble carta desde $12.40"] },
      { label: "Opalina - Laser", items: ["Carta desde $8.00", "Doble carta desde $18.00", "13x19 desde $25.00"] },
      { label: "Couche / Kromacote", items: ["Carta desde $8.00", "Doble carta desde $18.00", "13x19 desde $28.00"] },
    ],
    extras: ["Laminado / Enmicado disponible", "Impresión a doble cara"],
  },
  {
    id: "ploteo",
    titulo: "Ploteo de Planos",
    icon: "📐",
    color: "green",
    desde: "$25.00",
    tabla: [
      { label: "Bond 90g — B/N",    items: ["90×60 cm $25", "120×90 cm $35", "Pliego completo $60"] },
      { label: "Bond 90g — Color",  items: ["90×60 cm $45", "120×90 cm $65", "Pliego completo $110"] },
      { label: "Opalina / Fotog.",  items: ["90×60 cm $80", "120×90 cm $120", "Pliego completo $200"] },
      { label: "Lona / Canvas",     items: ["90×60 cm $150", "120×90 cm $220", "Pliego completo $380"] },
    ],
    extras: ["Vinil y vinilo adhesivo disponible", "Doblado, enrollado o enmarcado"],
  },
  {
    id: "artes",
    titulo: "Impresos Comerciales",
    icon: "📰",
    color: "purple",
    desde: "$350 / millar",
    tabla: [
      { label: "Eco 115g carta",    items: ["1 millar $350", "2 millares $580", "5 millares $1,100"] },
      { label: "Couché 300g carta", items: ["1 millar $650", "2 millares $1,050", "5 millares $2,200"] },
      { label: "Bond 75g carta",    items: ["1 millar $280", "2 millares $480", "5 millares $900"] },
    ],
    extras: ["Mínimo 1,000 piezas", "Acabados: díptico, tríptico, foliado, perforado"],
  },
  {
    id: "stickers",
    titulo: "Stickers",
    icon: "✂️",
    color: "pink",
    desde: "$0.80 c/u",
    tabla: [
      { label: "50 piezas",   items: ["5×5 cm desde $80", "10×10 cm desde $160", "Personalizado: cotizar"] },
      { label: "100 piezas",  items: ["5×5 cm desde $120", "10×10 cm desde $260", "Personalizado: cotizar"] },
      { label: "250 piezas",  items: ["5×5 cm desde $200", "10×10 cm desde $420", "Personalizado: cotizar"] },
      { label: "500 piezas",  items: ["5×5 cm desde $320", "10×10 cm desde $700", "Personalizado: cotizar"] },
    ],
    extras: ["Vinil mate, brillante o transparente", "Corte individual o en hoja", "Laminado disponible"],
  },
  {
    id: "pvc",
    titulo: "Tarjetas PVC",
    icon: "💳",
    color: "cyan",
    desde: "$18.00 c/u",
    tabla: [
      { label: "Frente normal", items: ["1-10 $30 c/u", "26-100 $20 c/u", "101+ $18 c/u"] },
      { label: "Frente especial", items: ["Perforada desde $20", "NFC desde $25", "Tira magnetica desde $30"] },
      { label: "Ambos lados", items: ["Normal desde $25", "Perforada desde $30", "NFC desde $35"] },
      { label: "Ambos + magnetica", items: ["1-10 $57 c/u", "26-100 $46 c/u", "101+ $40 c/u"] },
    ],
    extras: ["Credenciales, membresías, tarjetas de presentación", "Formato estándar CR80"],
  },
  {
    id: "sublimacion",
    titulo: "Sublimación",
    icon: "☕",
    color: "yellow",
    desde: "$30.00",
    tabla: [
      { label: "Tazas", items: ["1-5 $60 c/u", "16-25 $50 c/u", "31+ $30 c/u"] },
      { label: "Tazas magicas", items: ["1-5 $95 c/u", "16-25 $80 c/u", "31+ $60 c/u"] },
      { label: "Playeras", items: ["Nino desde $150", "CH/M/G desde $150", "1-2 adulto $280"] },
      { label: "Termos", items: ["1-5 $450 c/u", "16-25 $400 c/u", "31+ $350 c/u"] },
    ],
    extras: ["Personalización con foto o diseño", "Pedidos en lote con descuento"],
  },
  {
    id: "fotobotones",
    titulo: "Fotobotones / Pines",
    icon: "📌",
    color: "red",
    desde: "$9.00 c/u",
    tabla: [
      { label: "Normal 5.8 cm", items: ["1-10 $17 c/u", "51-100 $13.42 c/u", "200+ $9 c/u"] },
      { label: "Destapador 5.8 cm", items: ["1-10 $20 c/u", "51-100 $13.42 c/u", "200+ $9 c/u"] },
      { label: "Imantado 5.8 cm", items: ["1-10 $25 c/u", "101-200 $12 c/u", "200+ $10 c/u"] },
      { label: "Llavero 5.8 cm", items: ["1-10 $28 c/u", "101-200 $15 c/u", "200+ $12 c/u"] },
    ],
    extras: ["Pin metálico de seguridad", "Imán disponible", "Diseño incluido"],
  },
  {
    id: "escaneo",
    titulo: "Escaneo / Digitalización",
    icon: "📷",
    color: "teal",
    desde: "$0.40 / hoja",
    tabla: [
      { label: "Carta / Oficio", items: ["1-50 $3 c/u", "101-200 $1.47 c/u", "1000+ $0.40 c/u"] },
      { label: "Doble carta", items: ["1-50 $6 c/u", "201-500 $3 c/u", "1000+ $1 c/u"] },
      { label: "Planos", items: ["1-50 $30 c/u", "201-500 $15 c/u", "1000+ $6 c/u"] },
    ],
    extras: ["Salida PDF, JPG o TIFF", "Alta resolución 300–600 DPI", "USB o correo electrónico"],
  },
];

const COLOR_MAP = {
  blue:   { badge: "bg-blue-500/15 text-blue-300 border-blue-400/30",   dot: "bg-blue-400",   header: "from-blue-500/10" },
  orange: { badge: "bg-orange-500/15 text-orange-300 border-orange-400/30", dot: "bg-orange-400", header: "from-orange-500/10" },
  green:  { badge: "bg-green-500/15 text-green-300 border-green-400/30", dot: "bg-green-400",  header: "from-green-500/10" },
  purple: { badge: "bg-purple-500/15 text-purple-300 border-purple-400/30", dot: "bg-purple-400", header: "from-purple-500/10" },
  pink:   { badge: "bg-pink-500/15 text-pink-300 border-pink-400/30",   dot: "bg-pink-400",   header: "from-pink-500/10" },
  cyan:   { badge: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",   dot: "bg-cyan-400",   header: "from-cyan-500/10" },
  yellow: { badge: "bg-yellow-500/15 text-yellow-300 border-yellow-400/30", dot: "bg-yellow-400", header: "from-yellow-500/10" },
  red:    { badge: "bg-red-500/15 text-red-300 border-red-400/30",      dot: "bg-red-400",    header: "from-red-500/10" },
  teal:   { badge: "bg-teal-500/15 text-teal-300 border-teal-400/30",   dot: "bg-teal-400",   header: "from-teal-500/10" },
};

const ICON_MAP = {
  copias: Printer,
  acabados: BookOpen,
  impresion: Palette,
  ploteo: Ruler,
  artes: Newspaper,
  stickers: Scissors,
  pvc: CreditCard,
  sublimacion: Coffee,
  fotobotones: CircleDot,
  escaneo: Camera,
};

function ServicioCard({ s, expanded, onToggle }) {
  const c = COLOR_MAP[s.color] || COLOR_MAP.blue;
  const Icon = ICON_MAP[s.id] || Printer;
  const ExpandIcon = expanded ? ChevronUp : ChevronDown;

  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-card transition-colors duration-200 hover:border-primary/70"
      style={{ backgroundColor: "#111827" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between gap-3 bg-gradient-to-r ${c.header} to-transparent px-4 py-4 text-left`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${c.badge}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">{s.titulo}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Precios de referencia · IVA incluido</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${c.badge}`}>
            desde {s.desde}
          </span>
          <ExpandIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border/60 px-4 pb-4 pt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {s.tabla.map((fila) => (
              <div key={fila.label} className="rounded-lg border border-border/70 bg-secondary/35 p-3">
                <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">{fila.label}</p>
                <ul className="space-y-1">
                  {fila.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-slate-300">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {s.extras.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {s.extras.map((e) => (
                <span key={e} className="rounded-md border border-border/70 bg-secondary/35 px-2.5 py-1 text-[11px] text-muted-foreground">
                  {e}
                </span>
              ))}
            </div>
          )}

          <a
            href="/#servicios"
            className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold transition-colors ${c.badge.split(" ")[1]}`}
          >
            Hacer pedido
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

export default function Precios() {
  const [expandedId, setExpandedId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? SERVICIOS_PRECIOS : SERVICIOS_PRECIOS.slice(0, 3);

  function toggle(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <h2 className="text-2xl font-semibold text-white">
          Precios de referencia
        </h2>
        <p className="text-sm leading-6 text-muted-foreground md:max-w-md md:text-right">
          Precios aproximados de referencia. El total estimado se confirma al configurar tu pedido.
        </p>
      </div>

      <div className="space-y-2">
        {visible.map((s) => (
          <ServicioCard
            key={s.id}
            s={s}
            expanded={expandedId === s.id}
            onToggle={() => toggle(s.id)}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => { setShowAll((v) => !v); if (showAll) setExpandedId(null); }}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/70 px-5 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-muted hover:text-white"
        >
          {showAll ? "Ver menos servicios" : `Ver los ${SERVICIOS_PRECIOS.length - 3} servicios restantes`}
          {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        ¿Tienes un proyecto especial? Escríbenos por WhatsApp para una cotización personalizada.
      </p>
    </div>
  );
}
