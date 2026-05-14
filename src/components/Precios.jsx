const precios = [
  {
    titulo: "Copias B/N",
    icon: "🖨️",
    desde: "$0.50",
    items: ["Carta y oficio", "Volumen desde 50 pzas", "Engargolado disponible"],
  },
  {
    titulo: "Impresión Color",
    icon: "🎨",
    desde: "$3.00",
    items: ["Carta, tabloide, doble carta", "Papel couché u opalina", "Acabados laminado/enmicado"],
  },
  {
    titulo: "Ploteo de Planos",
    icon: "📐",
    desde: "$25.00",
    items: ["Bond 90g / vegetal / calca", "Formatos A3, A2, A1, A0", "Doblado o enrollado"],
  },
];

export default function Precios() {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold" style={{ color: '#F5F7FA' }}>Precios de referencia</h2>
        <p className="hidden sm:block text-sm" style={{ color: '#9AA6B2' }}>
          Precios aproximados. El total se confirma en tu pedido.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {precios.map((p) => (
          <div
            key={p.titulo}
            className="rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl"
            style={{ backgroundColor: '#111827', border: '1px solid #273449' }}
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl">{p.icon}</span>
              <span
                className="text-xs font-semibold px-2 py-1 rounded-full"
                style={{ background: 'rgba(31,74,168,0.15)', color: '#4E7BDA', border: '1px solid rgba(31,74,168,0.3)' }}
              >
                desde {p.desde}
              </span>
            </div>

            <h3 className="mt-3 font-semibold text-base" style={{ color: '#F5F7FA' }}>{p.titulo}</h3>

            <ul className="mt-3 space-y-1.5">
              {p.items.map((li) => (
                <li key={li} className="flex items-center gap-2 text-sm" style={{ color: '#9AA6B2' }}>
                  <span style={{ color: '#2F5FC1' }}>›</span>
                  {li}
                </li>
              ))}
            </ul>

            <a
              href="#servicios"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium transition-colors"
              style={{ color: '#4E7BDA' }}
            >
              Pedir ahora →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
