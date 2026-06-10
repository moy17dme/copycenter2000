import { ExternalLink, Star } from "lucide-react";

const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/?cid=14514007548682504090";
const RATING = 4.5;
const REVIEW_COUNT = 54;

export default function GoogleReviews() {
  return (
    <div aria-labelledby="google-reviews-title">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="grid gap-7 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
              Reseñas verificables
            </p>
            <h2
              id="google-reviews-title"
              className="mt-2 text-2xl font-semibold text-white"
            >
              Opiniones en Google
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Consulta las experiencias publicadas directamente en el perfil de
              Copy Center 2000 en Google Maps. El enlace se abre en Google para
              mantener la fuente y el contenido de cada opinión verificables.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Calificación consultada el 10 de junio de 2026.
            </p>
          </div>

          <div className="min-w-[230px] border-t border-border pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <div
              className="flex items-end gap-2"
              aria-label={`${RATING} de 5 estrellas en ${REVIEW_COUNT} opiniones de Google`}
            >
              <strong className="text-5xl font-bold tabular-nums text-white">
                {RATING}
              </strong>
              <span className="pb-1 text-sm text-muted-foreground">/ 5</span>
            </div>

            <div className="mt-2 flex gap-1" aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} className="relative h-5 w-5">
                  <Star className="absolute inset-0 h-5 w-5 text-slate-600" />
                  {index < Math.ceil(RATING) && (
                    <span
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        width:
                          index < Math.floor(RATING)
                            ? "100%"
                            : `${(RATING % 1) * 100}%`,
                      }}
                    >
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    </span>
                  )}
                </span>
              ))}
            </div>

            <p className="mt-2 text-sm text-slate-300">
              {REVIEW_COUNT} opiniones en Google
            </p>

            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-blue mt-5 w-full justify-center"
              aria-label="Ver las opiniones de Copy Center 2000 en Google Maps, abre en una pestaña nueva"
            >
              Ver opiniones
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
