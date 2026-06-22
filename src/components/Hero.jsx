import { ArrowRight, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import fondo from "../assets/fon.webp";

export default function Hero() {
  const stats = [
    { label: "Servicios", value: "9+" },
    { label: "Lun-Vie", value: "8:00-19:30" },
    { label: "Sabado", value: "9:00-15:00" },
  ];

  return (
    <div
      className="relative min-h-[420px] overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-soft)] md:min-h-[500px]"
    >
      <img
        src={fondo}
        alt=""
        width="1625"
        height="652"
        fetchpriority="high"
        decoding="async"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(10,14,20,0.98) 0%, rgba(10,14,20,0.86) 54%, rgba(10,14,20,0.44) 100%)",
        }}
      />

      <div className="relative z-10 flex min-h-[420px] max-w-3xl flex-col justify-center p-5 sm:p-7 md:min-h-[500px] md:p-10">
        <span className="hero-badge mb-5 inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-secondary/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          Copy Center 2000 - Pachuca
        </span>

        <h1 className="hero-title max-w-2xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
          Sube tus archivos y haz tu pedido de impresion en minutos
        </h1>

        <p className="hero-desc mt-4 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
          Copias, ploteo de planos, stickers, tarjetas PVC y artes graficas.
          Elige el servicio, adjunta tu archivo y confirma el pedido sin vueltas.
        </p>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-slate-300">
          <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1">PDF e imagenes</span>
          <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1">Precios de referencia</span>
          <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1">Atencion por WhatsApp</span>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/#servicios"
            className="hero-btn inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 active:scale-[.99]"
          >
            Realizar pedido
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/precios"
            className="hero-btn inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/70 px-5 py-3 text-sm font-semibold text-secondary-foreground transition hover:bg-muted hover:text-white"
          >
            Ver precios
          </Link>
        </div>

        <div className="mt-9 grid max-w-2xl grid-cols-1 border-t border-border/80 pt-5 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="hero-stat flex items-start gap-3 py-2 sm:border-r sm:border-border/70 sm:px-4 first:sm:pl-0 last:sm:border-r-0">
              <Clock className="mt-1 h-4 w-4 shrink-0 text-primary-600" />
              <div>
                <div className="text-xl font-bold tabular-nums text-white">{s.value}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
