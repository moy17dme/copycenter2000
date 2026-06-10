import { Camera, MessageSquareText } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { PUBLIC_SERVICES } from "../data/publicServices";

const portfolioSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Portafolio de Copy Center 2000",
  url: "https://copycenter2000.com/portafolio",
  about: {
    "@id": "https://copycenter2000.com/#localbusiness",
  },
};

export default function PortfolioPage() {
  return (
    <PageShell
      path="/portafolio"
      eyebrow="Procesos y acabados"
      title="Muestras visuales de lo que podemos producir"
      intro="Explora capacidades de impresión, gran formato, etiquetas, credenciales, personalizados y digitalización para imaginar tu siguiente proyecto."
      breadcrumbLabel="Portafolio"
      structuredData={portfolioSchema}
    >
      <aside className="mt-8 flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-5 text-sm leading-6 text-slate-300">
        <Camera className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <p>
          Las imágenes actuales son ilustrativas de los servicios y procesos.
          Materiales, color y acabado pueden variar; solicita una muestra o
          confirma especificaciones antes de producir.
        </p>
      </aside>

      <section aria-labelledby="galeria" className="py-10">
        <h2 id="galeria" className="sr-only">
          Galería de capacidades
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PUBLIC_SERVICES.map((item) => (
            <figure
              key={item.id}
              className="group overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="overflow-hidden">
                <img
                  src={item.image}
                  alt={item.alt}
                  className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.025]"
                  loading="lazy"
                />
              </div>
              <figcaption className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">
                  {item.tag}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <aside className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-6 sm:p-8">
        <MessageSquareText className="h-6 w-6 text-blue-300" />
        <h2 className="mt-4 text-2xl font-semibold text-white">
          Tu proyecto puede tener otra medida, material o acabado
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Comparte una referencia y explica dónde se usará. Así podremos
          recomendar resolución, papel, protección, corte y cantidad.
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
