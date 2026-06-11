import { ExternalLink, Quote, Star } from "lucide-react";
import {
  GOOGLE_BUSINESS_PROFILE,
  TESTIMONIALS,
} from "../data/trustEvidence";

const { href, rating, reviewCount, checkedAt } = GOOGLE_BUSINESS_PROFILE;

export default function GoogleReviews() {
  const publishedTestimonials = TESTIMONIALS.filter(
    (item) => item.consentConfirmed && item.href,
  );

  return (
    <div aria-labelledby="google-reviews-title">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <div className="p-5 sm:p-7 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
              Opiniones con fuente
            </p>
            <h2
              id="google-reviews-title"
              className="mt-2 text-2xl font-semibold text-white"
            >
              Lo que clientes publican sobre Copy Center 2000
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Sólo reproducimos testimonios cuando contamos con texto exacto,
              autor, fecha, enlace directo y autorización para publicarlo.
            </p>

            {publishedTestimonials.length > 0 ? (
              <div className="mt-7 space-y-5">
                {publishedTestimonials.map((item) => (
                  <blockquote
                    key={item.id}
                    className="border-t border-border pt-5 first:border-0 first:pt-0"
                  >
                    <Quote className="h-5 w-5 text-blue-300" aria-hidden="true" />
                    <p className="mt-3 text-base font-medium leading-7 text-slate-100">
                      &ldquo;{item.text}&rdquo;
                    </p>
                    <footer className="mt-2 text-xs leading-5 text-muted-foreground">
                      {item.author} · {item.source} ·{" "}
                      <time dateTime={item.date}>{formatDate(item.date)}</time>
                    </footer>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 underline decoration-blue-300/40 underline-offset-4 hover:text-blue-200"
                    >
                      Ver publicación original
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </blockquote>
                ))}
              </div>
            ) : (
              <div className="mt-7 rounded-xl border border-border bg-secondary/30 p-5">
                <p className="text-sm font-semibold text-white">
                  Consulta las opiniones en su fuente original
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Mientras documentamos consentimientos individuales, las
                  opiniones completas permanecen disponibles en Google Maps.
                </p>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 underline underline-offset-4"
                >
                  Abrir Perfil de Empresa en Google
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            )}
          </div>

          <div className="border-t border-border bg-secondary/30 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-sm font-semibold text-slate-200">
              Calificación publicada en Google
            </p>
            <div
              className="mt-4 flex items-end gap-2"
              aria-label={`${rating} de 5 estrellas en ${reviewCount} opiniones publicadas en Google`}
            >
              <strong className="text-6xl font-bold tabular-nums text-white">
                {rating}
              </strong>
              <span className="pb-2 text-sm text-muted-foreground">/ 5</span>
            </div>

            <div className="mt-3 flex gap-1" aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} className="relative h-5 w-5">
                  <Star className="absolute inset-0 h-5 w-5 text-slate-600" />
                  {index < Math.ceil(rating) && (
                    <span
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        width:
                          index < Math.floor(rating)
                            ? "100%"
                            : `${(rating % 1) * 100}%`,
                      }}
                    >
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    </span>
                  )}
                </span>
              ))}
            </div>

            <p className="mt-2 text-sm text-slate-300">
              {reviewCount} opiniones publicadas en Google
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Consultado el {formatDate(checkedAt)}. La cifra puede cambiar.
            </p>

            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-blue mt-5 w-full justify-center"
              aria-label="Ver las opiniones de Copy Center 2000 en Google Maps, abre en una pestaña nueva"
            >
              Ver todas las opiniones
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>

            <div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4">
              <p className="text-xs font-semibold text-emerald-300">Garantía de calidad</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Si el resultado presenta un defecto atribuible a nosotros,
                corregimos, reponemos o reembolsamos conforme a nuestros términos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}
