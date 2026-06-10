import { BookOpen, Camera, MessageSquareText, Printer, Users } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { PUBLIC_SERVICES } from "../data/publicServices";

const caseStudies = [
  {
    icon: BookOpen,
    tag: "Impresión académica",
    title: "Tesis e impresiones universitarias",
    description:
      "Estudiantes de la UAEH, UNAM campus Hidalgo y UTPA nos confían sus tesis, proyectos y prácticas cada ciclo escolar. Manejamos empastado, engargolado y pasta dura con entrega el mismo día o al siguiente según el volumen.",
    result: "Miles de documentos académicos producidos desde 1999.",
  },
  {
    icon: Printer,
    tag: "Gran formato",
    title: "Planos técnicos para arquitectura e ingeniería",
    description:
      "Despachos de arquitectura, constructoras e ingenieros de Pachuca y la región depositan sus planos en formatos A1, A0 y rollos. Impresión en papel bond, vegetal y lona con precisión de escala.",
    result: "Servicio de ploteo continuo para proyectos de construcción activos.",
  },
  {
    icon: Users,
    tag: "Negocios y eventos",
    title: "Materiales promocionales y corporativos",
    description:
      "Tarjetas de presentación, credenciales PVC, lonas para eventos, uniformes sublimados y papelería corporativa para negocios locales de Pachuca y municipios cercanos.",
    result: "Negocios locales que regresan regularmente para sus materiales de temporada.",
  },
];

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
      <aside className="mt-8 flex items-start gap-3 rounded-xl border border-blue-400/20 bg-blue-500/5 p-5 text-sm leading-6 text-slate-300">
        <Camera className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
        <p>
          Las imágenes muestran el tipo de productos que producimos. Materiales,
          color y acabado final dependen de las especificaciones de cada pedido.
          Para confirmar resultado exacto, solicita una muestra física antes de
          producción completa.
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

      {/* Casos representativos */}
      <section aria-labelledby="casos" className="border-t border-border py-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
            Proyectos representativos
          </p>
          <h2 id="casos" className="mt-3 text-2xl font-semibold text-white">
            Lo que producimos para clientes reales
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            En 26 años hemos atendido miles de proyectos. Estos son algunos de
            los tipos de trabajos más recurrentes.
          </p>
        </div>
        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {caseStudies.map(({ icon: Icon, tag, title, description, result }) => (
            <article
              key={title}
              className="flex flex-col rounded-xl border border-border bg-card p-6"
            >
              <span className="grid h-11 w-11 place-items-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-300">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">
                {tag}
              </p>
              <h3 className="mt-2 font-semibold text-white">{title}</h3>
              <p className="mt-3 grow text-sm leading-6 text-muted-foreground">
                {description}
              </p>
              <p className="mt-5 border-t border-border pt-4 text-xs text-slate-400">
                {result}
              </p>
            </article>
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
