import {
  Award,
  BadgeCheck,
  FileCheck2,
  History,
  MapPin,
  Printer,
  Settings2,
  Star,
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
    text: "Aclara el uso final, la cantidad, la fecha de entrega y las alternativas de material. Con más de 26 años atendiendo proyectos, el equipo identifica rápidamente la solución más eficiente.",
  },
  {
    title: "Preprensa y producción",
    text: "Revisa formato, resolución, tamaño y condiciones técnicas antes de imprimir o personalizar. Se detectan errores antes de producir, no después.",
  },
  {
    title: "Acabados y entrega",
    text: "Verifica corte, armado, engargolado, laminado o presentación final antes de entregar. Cada pieza sale revisada, no sólo producida.",
  },
];

const equipment = [
  {
    icon: Printer,
    title: "Impresión digital de alta resolución",
    text: "Equipos de producción de gran formato y tamaño estándar para tirajes desde una copia hasta miles de piezas con consistencia de color.",
  },
  {
    icon: Settings2,
    title: "Ploteo de planos arquitectónicos",
    text: "Trazadores de precisión para planos técnicos en papel bond, vegetal y lona. Resolución adecuada para escalas 1:50, 1:100 y más.",
  },
  {
    icon: BadgeCheck,
    title: "Sublimación y personalizados",
    text: "Prensas térmicas de temperatura controlada para tazas, camisetas, agendas y materiales rígidos con diseños a todo color.",
  },
];

const achievements = [
  { value: "26+", label: "Años operando en Pachuca" },
  { value: "1999", label: "Año de fundación" },
  { value: "54+", label: "Reseñas verificadas en Google" },
  { value: "4.5★", label: "Calificación Google" },
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

      {/* Logros en números */}
      <section aria-labelledby="logros" className="border-t border-border py-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {achievements.map(({ value, label }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card p-5 text-center"
            >
              <p className="text-3xl font-bold text-blue-300">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capacidades y equipamiento */}
      <section aria-labelledby="equipo-tecnico" className="border-t border-border py-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 text-blue-300">
            <Settings2 className="h-6 w-6" />
            <p className="text-sm font-semibold uppercase tracking-[0.16em]">
              Capacidades técnicas
            </p>
          </div>
          <h2 id="equipo-tecnico" className="mt-3 text-2xl font-semibold text-white">
            Equipo y tecnología al servicio de tu proyecto
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Contamos con equipos de producción para impresión digital, gran formato,
            sublimación y acabados especiales, todo operado por personal con más
            de dos décadas de experiencia en preprensa y producción gráfica.
          </p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {equipment.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-xl border border-border p-5">
              <Icon className="h-5 w-5 text-blue-300" />
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Equipo y responsabilidades */}
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
            El equipo fundador lleva operando desde 1999. Cada etapa del proceso
            tiene un responsable definido para garantizar que el resultado coincida
            con lo cotizado.
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

      {/* Reconocimiento y trayectoria */}
      <section aria-labelledby="reconocimiento" className="border-t border-border py-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 text-blue-300">
            <Award className="h-6 w-6" />
            <p className="text-sm font-semibold uppercase tracking-[0.16em]">
              Trayectoria y confianza
            </p>
          </div>
          <h2 id="reconocimiento" className="mt-3 text-2xl font-semibold text-white">
            Más de dos décadas siendo referencia en Pachuca
          </h2>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <Star className="h-5 w-5 text-amber-400" />
            <h3 className="mt-4 font-semibold text-white">4.5 / 5 en Google</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              54 reseñas verificadas de clientes reales. Calificación consultable
              directamente en el perfil de Google Business.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <BadgeCheck className="h-5 w-5 text-blue-300" />
            <h3 className="mt-4 font-semibold text-white">Licencia municipal vigente</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Negocio registrado y con respaldo de licencia de funcionamiento
              del municipio de Pachuca de Soto, Hidalgo.{" "}
              <a
                href="https://datos.pachuca.gob.mx/sipot/27/PDFS/Licencias_Funcionamiento_2018.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 underline decoration-blue-300/40 underline-offset-4 hover:text-blue-200"
              >
                Ver respaldo
              </a>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <History className="h-5 w-5 text-blue-300" />
            <h3 className="mt-4 font-semibold text-white">Fundado el 4 de octubre de 1999</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Uno de los centros de impresión con mayor antigüedad activa en
              Pachuca. Hemos acompañado proyectos de estudiantes, profesionistas,
              negocios y dependencias desde hace más de 26 años.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <UsersRound className="h-5 w-5 text-blue-300" />
            <h3 className="mt-4 font-semibold text-white">Clientes recurrentes</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Estudiantes universitarios, despachos de arquitectura, empresas
              locales y público general confían en Copy Center 2000 para sus
              proyectos de impresión semana a semana.
            </p>
          </div>
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
