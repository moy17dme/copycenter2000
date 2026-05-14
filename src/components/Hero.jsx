import fondo from "../assets/fon.png";

export default function Hero() {
  return (
    <div
      className="relative rounded-3xl overflow-hidden p-8 md:p-12 shadow-2xl"
      style={{ backgroundImage: `url(${fondo})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, rgba(10,14,20,0.92) 0%, rgba(10,14,20,0.65) 60%, rgba(31,74,168,0.25) 100%)" }}
      />

      <div className="relative z-10 max-w-2xl">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest rounded-full px-3 py-1 mb-5"
          style={{ color: '#9AA6B2', background: 'rgba(27,36,51,0.8)', border: '1px solid #273449' }}>
          Copy Center 2000 · Pachuca, Hidalgo
        </span>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight"
          style={{ color: '#F5F7FA' }}>
          Impresiones digitales,{" "}
          <span style={{ color: '#4E7BDA' }}>
            acabados profesionales
          </span>
        </h1>

        <p className="mt-4 text-base md:text-lg max-w-lg" style={{ color: '#9AA6B2' }}>
          Copias, ploteo de planos y artes gráficas con calidad y rapidez.
          Sube tus archivos y realiza tu pedido en segundos.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#servicios"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm shadow-lg transition-all hover:scale-[1.03] active:scale-[.98]"
            style={{ backgroundColor: '#C61C1C', color: '#FFFFFF' }}
          >
            ¡Realiza tu pedido ahora!
          </a>
          <a
            href="#precios"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all"
            style={{ border: '1px solid #273449', color: '#E5ECF6', backgroundColor: 'rgba(27,36,51,0.6)' }}
          >
            Ver precios
          </a>
        </div>

        <div className="mt-10 flex flex-wrap gap-8">
          {[
            { label: "Servicios disponibles", value: "9+" },
            { label: "Lun–Vie", value: "8–19:30" },
            { label: "Sáb", value: "9–15:00" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold" style={{ color: '#F5F7FA' }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: '#9AA6B2' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
