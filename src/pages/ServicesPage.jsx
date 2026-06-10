import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { PUBLIC_SERVICES } from "../data/publicServices";

const servicesSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Servicios de Copy Center 2000",
  itemListElement: PUBLIC_SERVICES.map((service, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `https://copycenter2000.com/servicios#${service.id}`,
    name: service.title,
  })),
};

export default function ServicesPage() {
  return (
    <PageShell
      path="/servicios"
      eyebrow="Soluciones de impresion"
      title="Servicios para imprimir, producir y presentar tus ideas"
      intro="Desde una copia hasta un proyecto en gran formato. Revisa las opciones, prepara tu archivo y configura el servicio desde el sistema de pedidos."
      breadcrumbLabel="Servicios"
      structuredData={servicesSchema}
    >
      <section aria-labelledby="catalogo-servicios" className="py-10">
        <h2 id="catalogo-servicios" className="sr-only">
          Catalogo de servicios
        </h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PUBLIC_SERVICES.map((service) => (
            <article
              key={service.id}
              id={service.id}
              className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card"
            >
              <img
                src={service.image}
                alt={service.alt}
                className="aspect-[16/10] w-full object-cover"
                loading="lazy"
              />
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">
                  {service.tag}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {service.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {service.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {service.details.map((detail) => (
                    <li
                      key={detail}
                      className="flex items-start gap-2 text-sm text-slate-300"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                      {detail}
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/#servicios`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 transition hover:text-blue-200"
                >
                  Configurar servicio
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-6">
        <h2 className="text-xl font-semibold text-white">
          ¿No encuentras exactamente lo que necesitas?
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Los materiales, medidas y acabados pueden combinarse según el proyecto.
          Comparte cantidad, tamaño, fecha de entrega y archivo para recibir una
          cotización precisa.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/#servicios" className="btn-blue">
            Iniciar pedido
          </Link>
          <Link to="/contacto" className="btn-outline">
            Solicitar orientación
          </Link>
        </div>
      </aside>
    </PageShell>
  );
}
