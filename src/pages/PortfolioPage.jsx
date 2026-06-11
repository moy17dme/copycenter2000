import { CalendarDays, Camera, CheckCircle2, MessageSquareText } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { PORTFOLIO_CASES } from "../data/trustEvidence";

const portfolioSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Casos documentados de Copy Center 2000",
  url: "https://copycenter2000.com/portafolio/",
  about: {
    "@id": "https://copycenter2000.com/#localbusiness",
  },
  ...(PORTFOLIO_CASES.length > 0
    ? {
        mainEntity: {
          "@type": "ItemList",
          itemListElement: PORTFOLIO_CASES.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.title,
            image: `https://copycenter2000.com${item.image}`,
          })),
        },
      }
    : {}),
};

export default function PortfolioPage() {
  return (
    <PageShell
      path="/portafolio"
      eyebrow="Trabajo documentado"
      title="Casos reales de impresión y producción gráfica"
      intro="Publicamos únicamente proyectos con fotografía propia o autorización de uso, junto con fecha, material, proceso y resultado."
      breadcrumbLabel="Portafolio"
      structuredData={portfolioSchema}
    >
      {PORTFOLIO_CASES.length > 0 ? (
        <section aria-labelledby="casos-documentados" className="py-10">
          <h2 id="casos-documentados" className="sr-only">
            Casos documentados
          </h2>
          <div className="space-y-10">
            {PORTFOLIO_CASES.map((item, index) => (
              <article
                key={item.id}
                className="grid gap-6 border-b border-border pb-10 last:border-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]"
              >
                <img
                  src={item.image}
                  alt={item.imageAlt}
                  className="aspect-[4/3] w-full rounded-xl border border-border object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                />
                <div className="self-center">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-semibold uppercase tracking-[0.14em] text-blue-300">
                      {item.service}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      <time dateTime={item.date}>{formatMonth(item.date)}</time>
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>

                  <dl className="mt-6 divide-y divide-border rounded-xl border border-border">
                    <CaseDetail label="Material" value={item.material} />
                    <CaseDetail label="Proceso" value={item.process} />
                    <CaseDetail label="Resultado" value={item.result} />
                  </dl>

                  {item.clientName && (
                    <p className="mt-4 text-xs text-slate-400">
                      Cliente:{" "}
                      {item.clientUrl ? (
                        <a
                          href={item.clientUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-300 underline underline-offset-4"
                        >
                          {item.clientName}
                        </a>
                      ) : (
                        item.clientName
                      )}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <Camera className="h-7 w-7 text-blue-300" />
            <h2 className="mt-5 text-2xl font-semibold text-white">
              Estamos preparando la colección con evidencia propia
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Las imágenes ilustrativas fueron retiradas de esta página. Los
              siguientes casos se publicarán únicamente después de confirmar la
              autoría de las fotografías y, cuando corresponda, el permiso del cliente.
            </p>
          </div>
          <aside className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-6">
            <h2 className="font-semibold text-white">Cada caso incluirá</h2>
            <ul className="mt-4 space-y-3">
              {["Fotografía real", "Fecha de producción", "Material y proceso", "Resultado verificable"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-blue-300" aria-hidden="true" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </aside>
        </section>
      )}

      <aside className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-6 sm:p-8">
        <MessageSquareText className="h-6 w-6 text-blue-300" />
        <h2 className="mt-4 text-2xl font-semibold text-white">
          ¿Quieres confirmar un material o acabado?
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Comparte una referencia y explica dónde se usará. Podemos recomendar
          resolución, papel, protección, corte y cantidad antes de producir.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/contacto" className="btn-blue">
            Cotizar una idea
          </Link>
          <Link to="/servicios" className="btn-outline">
            Revisar servicios
          </Link>
        </div>
      </aside>
    </PageShell>
  );
}

function CaseDetail({ label, value }) {
  return (
    <div className="grid gap-1 p-4 sm:grid-cols-[100px_1fr]">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </dt>
      <dd className="text-sm leading-6 text-slate-200">{value}</dd>
    </div>
  );
}

function formatMonth(value) {
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}
