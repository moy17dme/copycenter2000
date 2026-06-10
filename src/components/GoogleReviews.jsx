import { ExternalLink, Quote, Star } from "lucide-react";

const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/?cid=14514007548682504090";
const COMMUNITY_RECOMMENDATION_URL =
  "https://www.facebook.com/groups/561994571479942/posts/1716636049349116/";
const RATING = 4.5;
const REVIEW_COUNT = 54;

export default function GoogleReviews() {
  return (
    <div aria-labelledby="google-reviews-title">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <div className="p-5 sm:p-7 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
              Testimonios verificables
            </p>
            <h2
              id="google-reviews-title"
              className="mt-2 text-2xl font-semibold text-white"
            >
              Opiniones reales sobre Copy Center 2000
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Las fuentes se mantienen enlazadas para que puedas consultar la
              publicación original y el perfil del negocio.
            </p>

            <blockquote className="mt-7 border-y border-border py-6">
              <Quote className="h-6 w-6 text-blue-300" aria-hidden="true" />
              <p className="mt-4 max-w-2xl text-xl font-medium leading-8 text-slate-100">
                “En Copy Center 2000 atrás de la parada de las combis en
                gobierno...”
              </p>
              <footer className="mt-4 text-sm leading-6 text-muted-foreground">
                Recomendación pública en una comunidad local de Facebook sobre
                dónde imprimir fotografías.
              </footer>
            </blockquote>

            <a
              href={COMMUNITY_RECOMMENDATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 underline decoration-blue-300/40 underline-offset-4 hover:text-blue-200"
            >
              Ver publicación original
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          <div className="border-t border-border bg-secondary/30 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-sm font-semibold text-slate-200">
              Calificación en Google
            </p>
            <div
              className="mt-4 flex items-end gap-2"
              aria-label={`${RATING} de 5 estrellas en ${REVIEW_COUNT} opiniones de Google`}
            >
              <strong className="text-6xl font-bold tabular-nums text-white">
                {RATING}
              </strong>
              <span className="pb-2 text-sm text-muted-foreground">/ 5</span>
            </div>

            <div className="mt-3 flex gap-1" aria-hidden="true">
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
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Calificación consultada el 10 de junio de 2026.
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
