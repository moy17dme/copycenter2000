import {
  BadgeCheck,
  FileCheck2,
  History,
  MapPin,
  Printer,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";

const historySource =
  "https://datos.pachuca.gob.mx/sipot/27/PDFS/Licencias_Funcionamiento_2018.pdf";

const milestones = [
  {
    icon: History,
    title: "Más de 26 años de experiencia",
    text: "Copy Center 2000 fue fundado el 4 de octubre de 1999 y desde entonces ha acompañado proyectos de impresión en Pachuca.",
  },
  {
    icon: Printer,
    title: "Servicios que han evolucionado",
    text: "A la operación de copiado y papelería se sumaron impresión digital, gran formato, acabados, personalizados y pedidos en línea.",
  },
  {
    icon: FileCheck2,
    title: "Proceso técnico antes de producir",
    text: "Cada proyecto parte de revisar archivo, medida, material, cantidad y acabado para reducir errores y confirmar el alcance.",
  },
];

const roles = [
  {
    title: "Atención y cotización",
    text: "Aclara el uso final, la cantidad, la fecha de entrega y las alternativas de material.",
  },
  {
    title: "Preprensa y producción",
    text: "Revisa formato, resolución, tamaño y condiciones técnicas antes de imprimir o personalizar.",
  },
  {
    title: "Acabados y entrega",
    text: "Verifica corte, armado, engargolado, laminado o presentación final antes de entregar.",
  },
];

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "Acerca de Copy Center 2000",
  url: "https://copycenter2000.com/acerca-de",
  mainEntity: {
    "@id": "https://copycenter2000.com/#localbusiness",
    foundingDate: "1999-10-04",
  },
};

export default function AboutPage() {
  return (
    <PageShell
      path="/acerca-de"
      eyebrow="Experiencia local"
      title="Un centro de impresión cercano, técnico y orientado a resolver"
      intro="Fundado el 4 de octubre de 1999, Copy Center 2000 atiende proyectos de estudiantes, profesionistas, negocios y público general en Pachuca de Soto."
      breadcrumbLabel="Acerca de"
      structuredData={aboutSchema}
    >
      <section aria-labelledby="historia" className="py-10">
        <div className="grid gap-5 lg:grid-cols-3">
          {milestones.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-xl border border-border bg-card p-6"
            >
              <span className="grid h-11 w-11 place-items-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-300">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-xl font-semibold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {text}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-8 rounded-xl border border-border bg-secondary/30 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
              Nuestra historia
            </p>
            <h2 id="historia" className="mt-3 text-2xl font-semibold text-white">
              De fotocopiado y papelería a producción gráfica integral
            </h2>
            <div className="mt-4 space-y-4 text-[15px] leading-7 text-slate-300">
              <p>
                Copy Center 2000 fue fundado el 4 de octubre de 1999. A lo largo
                de más de 26 años, la oferta se ha ampliado para responder a
                archivos digitales, planos, tirajes comerciales, etiquetas,
                credenciales y productos personalizados.
              </p>
              <p>
                Hoy el sitio permite consultar especificaciones, cargar archivos,
                armar pedidos y conservar un historial, mientras la atención en
                sucursal y por WhatsApp mantiene el acompañamiento humano.
              </p>
            </div>
            <a
              href={historySource}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 underline decoration-blue-300/40 underline-offset-4 hover:text-blue-200"
            >
              Consultar respaldo municipal de operación
            </a>
          </div>

          <aside className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-6">
            <MapPin className="h-6 w-6 text-blue-300" />
            <h2 className="mt-4 text-lg font-semibold text-white">
              Presencia en Pachuca
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Calle Gral. Vicente Segura 301-A, colonia Periodistas, C.P. 42060,
              Pachuca de Soto, Hidalgo.
            </p>
            <Link to="/contacto" className="btn-outline mt-5">
              Ver ubicación y horarios
            </Link>
          </aside>
        </div>
      </section>

      <section aria-labelledby="equipo" className="border-t border-border py-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 text-blue-300">
            <UsersRound className="h-6 w-6" />
            <p className="text-sm font-semibold uppercase tracking-[0.16em]">
              Equipo y responsabilidades
            </p>
          </div>
          <h2 id="equipo" className="mt-3 text-2xl font-semibold text-white">
            Un pedido pasa por varias revisiones
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Más que publicar nombres sin contexto, explicamos las funciones que
            intervienen en la calidad y trazabilidad de cada trabajo.
          </p>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {roles.map((role) => (
            <article key={role.title} className="rounded-xl border border-border p-5">
              <BadgeCheck className="h-5 w-5 text-blue-300" />
              <h3 className="mt-4 font-semibold text-white">{role.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {role.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3 border-t border-border pt-8">
        <Link to="/servicios" className="btn-blue">
          Conocer servicios
        </Link>
        <Link to="/portafolio" className="btn-outline">
          Ver muestras de trabajo
        </Link>
      </div>
    </PageShell>
  );
}
