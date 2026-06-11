import {
  Award,
  BadgeCheck,
  FileCheck2,
  History,
  MapPin,
  Printer,
  Settings2,
  ShieldCheck,
  Star,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import {
  AUTHORITY_LINKS,
  GOOGLE_BUSINESS_PROFILE,
  MUNICIPAL_RECORD,
  TEAM_PROFILES,
} from "../data/trustEvidence";

const milestones = [
  {
    icon: History,
    title: "Más de 26 años de experiencia",
    text: "Copy Center 2000 fue fundado el 4 de octubre de 1999 y desde entonces ha acompañado proyectos de impresión en Pachuca.",
  },
  {
    icon: Printer,
    title: "Servicios que han evolucionado",
    text: "El centro de copiado incorporó ploteo de planos, artes gráficas, productos personalizados y herramientas para solicitar pedidos en línea.",
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
    title: "Equipos para producción gráfica",
    text: "La operación utiliza equipos de marcas como HP, Xerox, Epson y Kyocera para atender trabajos de impresión, copiado y gran formato.",
  },
  {
    icon: Settings2,
    title: "Ploteo de planos por volumen",
    text: "Producción de planos técnicos en volumen, con opción de doblado y revisión previa de formato, medida y cantidad.",
  },
  {
    icon: BadgeCheck,
    title: "Manuales y productos personalizados",
    text: "Producción de manuales para escuelas, artes gráficas y personalizados con sustratos seleccionados según el uso y acabado final.",
  },
];

const achievements = [
  { value: "26+", label: "Años operando en Pachuca" },
  { value: "1999", label: "Año de fundación" },
  {
    value: `${GOOGLE_BUSINESS_PROFILE.reviewCount}+`,
    label: "Opiniones publicadas en Google",
  },
  {
    value: `${GOOGLE_BUSINESS_PROFILE.rating}★`,
    label: "Calificación consultada en Google",
  },
];

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "Acerca de Copy Center 2000",
  url: "https://copycenter2000.com/acerca-de/",
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
                Copy Center 2000 inició el 4 de octubre de 1999 en Pachuca como
                centro de copiado. Posteriormente incorporó la impresión y el
                ploteo de planos, incluidos pedidos por volumen con doblado.
              </p>
              <p>
                La operación evolucionó hacia las artes gráficas, la producción
                de manuales para escuelas y los productos personalizados. Para
                estos trabajos se utilizan equipos de marcas como HP, Xerox,
                Epson y Kyocera, además de sustratos elegidos según la aplicación
                y el acabado solicitado.
              </p>
              <p>
                Hoy el sitio permite consultar especificaciones, cargar archivos,
                armar pedidos y conservar un historial, mientras la atención en
                sucursal y por WhatsApp mantiene el acompañamiento humano.
              </p>
            </div>
            <div className="mt-5 rounded-lg border border-blue-400/20 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-blue-300">
                {MUNICIPAL_RECORD.label}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                {MUNICIPAL_RECORD.description}
              </p>
            </div>
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
            La capacidad combina experiencia de operación, revisión de archivos y
            equipos de marcas reconocidas. La selección de equipo, material y
            acabado depende de las especificaciones de cada proyecto.
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
            Cada etapa del proceso tiene una responsabilidad definida para revisar
            que el resultado coincida con el archivo y las especificaciones cotizadas.
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

      {TEAM_PROFILES.length > 0 && (
        <section aria-labelledby="perfiles-equipo" className="border-t border-border py-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
              Personas responsables
            </p>
            <h2 id="perfiles-equipo" className="mt-3 text-2xl font-semibold text-white">
              Experiencia detrás de cada pedido
            </h2>
          </div>

          <div
            className={`mt-7 grid gap-6 ${
              TEAM_PROFILES.length > 1 ? "md:grid-cols-2" : "max-w-4xl"
            }`}
          >
            {TEAM_PROFILES.map((person) => (
              <article
                key={person.id}
                className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:grid-cols-[120px_1fr]"
              >
                {person.image ? (
                  <img
                    src={person.image}
                    alt={person.imageAlt}
                    className="aspect-square w-full rounded-lg object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="grid h-24 w-full place-items-center rounded-lg border border-blue-400/20 bg-blue-500/5 text-blue-300 sm:aspect-square sm:h-auto"
                    aria-hidden="true"
                  >
                    <ShieldCheck className="h-10 w-10" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">
                    {person.category}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {person.publicName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">{person.role}</p>
                  <p className="mt-1 text-sm text-slate-300">{person.experience}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{person.bio}</p>
                  <p className="mt-3 text-xs text-slate-400">
                    Especialidades: {person.specialties.join(", ")}
                  </p>
                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    {person.privacyNote}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

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
            <h3 className="mt-4 font-semibold text-white">
              {GOOGLE_BUSINESS_PROFILE.rating} / 5 en Google
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {GOOGLE_BUSINESS_PROFILE.reviewCount} opiniones publicadas. Calificación
              consultada el 10 de junio de 2026 y disponible directamente en el{" "}
              <a
                href={GOOGLE_BUSINESS_PROFILE.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 underline decoration-blue-300/40 underline-offset-4 hover:text-blue-200"
              >
                Perfil de Empresa en Google
              </a>
              .
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <BadgeCheck className="h-5 w-5 text-blue-300" />
            <h3 className="mt-4 font-semibold text-white">
              {MUNICIPAL_RECORD.label}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {MUNICIPAL_RECORD.description} {MUNICIPAL_RECORD.privacyNote}
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

      <section aria-labelledby="fuentes-externas" className="border-t border-border py-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
            Fuentes externas
          </p>
          <h2 id="fuentes-externas" className="mt-3 text-2xl font-semibold text-white">
            Perfiles y documentos consultables fuera del sitio
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Estos enlaces permiten contrastar información básica del negocio en
            plataformas y documentos externos.
          </p>
        </div>
        <div className="mt-7 divide-y divide-border rounded-xl border border-border">
          {AUTHORITY_LINKS.map((item) => (
            item.href ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="grid gap-2 p-5 transition hover:bg-secondary/35 sm:grid-cols-[220px_1fr]"
              >
                <span className="font-semibold text-blue-300">{item.label}</span>
                <span className="text-sm leading-6 text-muted-foreground">
                  {item.description}
                </span>
              </a>
            ) : (
              <div
                key={item.label}
                className="grid gap-2 p-5 sm:grid-cols-[220px_1fr]"
              >
                <span className="font-semibold text-blue-300">{item.label}</span>
                <span className="text-sm leading-6 text-muted-foreground">
                  {item.description}
                </span>
              </div>
            )
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
