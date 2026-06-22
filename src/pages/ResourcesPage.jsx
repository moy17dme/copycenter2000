import {
  ArrowRight,
  BookOpenCheck,
  FileText,
  Palette,
  Ruler,
} from "lucide-react";
import { Link } from "react-router-dom";
import digi from "../assets/digi.webp";
import PageShell from "../components/PageShell";

const resourcesSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Recursos de impresión de Copy Center 2000",
  url: "https://copycenter2000.com/recursos/",
  about: "Preparación de archivos para impresión",
};

const quickTopics = [
  {
    icon: FileText,
    title: "PDF listo para imprimir",
    text: "Conserva medidas, tipografías y distribución al exportar.",
  },
  {
    icon: Palette,
    title: "RGB y CMYK",
    text: "Entiende por qué el color de pantalla puede cambiar al imprimir.",
  },
  {
    icon: Ruler,
    title: "Sangrado y corte",
    text: "Evita bordes blancos y protege textos cercanos al borde.",
  },
];

export default function ResourcesPage() {
  return (
    <PageShell
      path="/recursos"
      eyebrow="Recursos de impresión"
      title="Guías para obtener mejores resultados antes de imprimir"
      intro="Resuelve dudas técnicas, prepara archivos más seguros y reduce correcciones antes de iniciar producción."
      breadcrumbLabel="Recursos"
      structuredData={resourcesSchema}
    >
      <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-stretch">
        <article className="overflow-hidden rounded-xl border border-border bg-card">
          <img
            src={digi}
            alt="Equipo y materiales de impresión digital"
            className="aspect-[16/8] w-full object-cover"
          />
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="font-semibold text-blue-300">Guía principal</span>
              <span aria-hidden="true">·</span>
              <span>8 minutos de lectura</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
              Cómo preparar archivos para imprimir
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Una guía paso a paso para elegir formato, resolución, color,
              sangrado y tipografías antes de enviar tu trabajo.
            </p>
            <Link
              to="/recursos/como-preparar-archivos-para-imprimir"
              className="btn-blue mt-6"
            >
              Leer la guía
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>

        <div className="flex flex-col justify-between rounded-xl border border-blue-400/20 bg-blue-500/5 p-6 sm:p-8">
          <div>
            <BookOpenCheck className="h-7 w-7 text-blue-300" />
            <h2 className="mt-5 text-2xl font-semibold text-white">
              Tres puntos que previenen la mayoría de los errores
            </h2>
          </div>
          <div className="mt-7 divide-y divide-border">
            {quickTopics.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4 py-5 first:pt-0 last:pb-0">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
                <div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-10">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              ¿Buscas una respuesta puntual?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              La sección de preguntas frecuentes incluye planos a escala,
              facturación, pruebas físicas, correcciones y garantías.
            </p>
          </div>
          <Link to="/preguntas-frecuentes" className="btn-outline">
            Ver preguntas frecuentes
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
