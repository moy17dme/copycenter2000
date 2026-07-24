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
import { useLocale } from "../i18n/LocaleContext";

// Resumen público basado en listadepreciospagina2026_modificada23_06_2026.xlsx.
const SERVICIOS_PRECIOS = [
  {
    id: "copias",
    titulo: "Copias",
    icon: "🖨️",
    color: "blue",
    referencia: "1-99 carta B/N: $1.00",
    tabla: [
      { label: "Copias B/N carta", items: ["1-99 $1.00", "100-499 $0.70", "500-999 $0.70", "1,000-4,999 $0.70"] },
      { label: "Copias B/N otros formatos", items: ["1-99 oficio $1.50", "1-99 doble carta $6.00", "100-499 oficio $1.00"] },
      { label: "Copias color láser", items: ["1-49 carta $8.00", "1-49 oficio $10.00", "1-49 doble carta $15.00"] },
      { label: "Copias color inyección", items: ["1-49 carta $3.00", "1-49 oficio $4.00", "1-49 doble carta $12.00"] },
    ],
    extras: ["Rangos por volumen según hojas", "Precios por hoja"],
  },
  {
    id: "impresion",
    titulo: "Impresión digital",
    icon: "🎨",
    color: "orange",
    referencia: "1-99 bond carta B/N: $1.00",
    tabla: [
      {
        label: "Papel Bond · Carta",
        items: [
          "1-99 B/N $1.00",
          "1-49 color inyección $3.00",
          "1-49 color láser $8.00",
        ],
      },
      {
        label: "Papel Opalina · Carta",
        items: [
          "1-50 B/N $4.40",
          "1-49 color inyección $6.00",
          "1-50 color láser $12.00",
        ],
      },
      {
        label: "Papel Autoadhesivo · Carta",
        items: [
          "1-50 B/N $12.00",
          "1-50 color láser $14.00",
        ],
      },
      {
        label: "Papeles especiales · Carta",
        items: [
          "Acetato: 1-99 B/N $6.00 · 1-49 color $12.00",
          "Kromacote, Couché y Sulfatada: 1-50 color $12.00",
        ],
      },
    ],
    extras: ["Bond, opalina, autoadhesivo, acetato, kromacote, couché y sulfatada", "Precios por página/hoja"],
  },
  {
    id: "acabados",
    titulo: "Engargolado / Enmicado",
    icon: "📌",
    color: "cyan",
    referencia: "1-10 enmicado carta: $20.00",
    tabla: [
      { label: "Engargolado metálico", items: ["1-45 págs $25", "46-85 págs $30", "181-280 págs $40"] },
      { label: "Engargolado plástico", items: ["0-30 págs $22", "111-140 págs $26", "451-500 págs $50"] },
      { label: "Enmicado 1-10 pzas", items: ["Carta $20", "Oficio $30", "Doble carta $45"] },
      { label: "Enmicado 21+ pzas", items: ["Carta $14", "Oficio $17", "Doble carta $25"] },
    ],
    extras: ["Pastas y micas según disponibilidad", "Precio por pieza o documento"],
  },
  {
    id: "pvc",
    titulo: "Tarjetas PVC",
    icon: "💳",
    color: "cyan",
    referencia: "1-10 un lado: $30.00 c/u",
    tabla: [
      { label: "Un solo lado normal", items: ["1-10 $30 c/u", "26-100 $20 c/u", "101+ $18 c/u"] },
      { label: "Un lado con extras", items: ["Perforación desde $20", "NFC desde $25", "Tira magnética desde $30"] },
      { label: "Ambos lados normal", items: ["1-10 $50 c/u", "26-100 $30 c/u", "101+ $25 c/u"] },
      { label: "Ambos lados con extras", items: ["Perforación desde $30", "NFC desde $35", "Tira magnética desde $40"] },
    ],
    extras: ["Credenciales, membresías, tarjetas de presentación", "Formato estándar CR80"],
  },
  {
    id: "sublimacion",
    titulo: "Sublimación",
    icon: "☕",
    color: "yellow",
    referencia: "1-5 tazas: $60.00 c/u",
    tabla: [
      { label: "Tazas", items: ["1-5 $60 c/u", "16-25 $50 c/u", "31+ $30 c/u"] },
      { label: "Tazas mágicas", items: ["1-5 $95 c/u", "16-25 $80 c/u", "31+ $60 c/u"] },
      { label: "Playeras", items: ["Niño desde $150", "CH/M/G desde $150", "1-2 adulto $280"] },
      { label: "Termos", items: ["1-5 $450 c/u", "16-25 $400 c/u", "31+ $350 c/u"] },
    ],
    extras: ["Personalización con foto o diseño", "Pedidos en lote con descuento"],
  },
  {
    id: "fotobotones",
    titulo: "Fotobotones / Pines",
    icon: "📌",
    color: "red",
    referencia: "1-10 normal: $17.00 c/u",
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
    referencia: "1-50 carta/oficio: $3.00 c/u",
    tabla: [
      { label: "Carta / Oficio", items: ["1-50 $3 c/u", "101-200 $1.47 c/u", "1000+ $0.40 c/u"] },
      { label: "Doble carta", items: ["1-50 $6 c/u", "201-500 $3 c/u", "1000+ $1 c/u"] },
      { label: "Planos", items: ["1-50 $30 c/u", "201-500 $15 c/u", "1000+ $6 c/u"] },
    ],
    extras: ["Salida PDF, JPG o TIFF", "Alta resolución 300-600 DPI", "USB o correo electrónico"],
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

function ServicioCard({ s, expanded, onToggle, t }) {
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
            <p className="mt-0.5 text-xs text-muted-foreground">{t("pricesList.includedTax")}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${c.badge}`}>
            {s.referencia}
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
            {t("pricesList.order")}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

export default function Precios() {
  const { t } = useLocale();
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
          {t("pricesList.title")}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground md:max-w-md md:text-right">
          {t("pricesList.intro")}
        </p>
      </div>

      <div className="space-y-2">
        {visible.map((s) => (
          <ServicioCard
            key={s.id}
            s={s}
            expanded={expandedId === s.id}
            onToggle={() => toggle(s.id)}
            t={t}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => { setShowAll((v) => !v); if (showAll) setExpandedId(null); }}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/70 px-5 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-muted hover:text-white"
        >
          {showAll
            ? t("pricesList.showLess")
            : t("pricesList.showMore", { count: SERVICIOS_PRECIOS.length - 3 })}
          {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t("pricesList.customQuote")}
      </p>
    </div>
  );
}
