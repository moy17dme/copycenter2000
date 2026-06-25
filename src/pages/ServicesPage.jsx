import { useMemo } from "react";
import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { getPublicServices } from "../data/publicServices";
import { useLocale } from "../i18n/LocaleContext";

export default function ServicesPage() {
  const { locale, t } = useLocale();
  const services = useMemo(() => getPublicServices(locale), [locale]);
  const servicesSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: locale === "en" ? "Copy Center 2000 services" : "Servicios de Copy Center 2000",
    itemListElement: services.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://copycenter2000.com/servicios/#${service.id}`,
      name: service.title,
    })),
  }), [locale, services]);

  return (
    <PageShell
      path="/servicios"
      eyebrow={t("servicesPage.eyebrow")}
      title={t("servicesPage.title")}
      intro={t("servicesPage.intro")}
      breadcrumbLabel={t("servicesPage.breadcrumb")}
      structuredData={servicesSchema}
    >
      <section aria-labelledby="catalogo-servicios" className="py-10">
        <h2 id="catalogo-servicios" className="sr-only">
          {t("servicesPage.catalogLabel")}
        </h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
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
                <div className="mt-4 flex items-start gap-2 border-y border-border/70 py-3 text-sm">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <div>
                    <span className="font-semibold text-slate-200">
                      {t("servicesPage.deliveryLabel")}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {service.delivery}
                    </span>
                  </div>
                </div>
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
                  {t("servicesPage.configure")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-6">
        <h2 className="text-xl font-semibold text-white">
          {t("servicesPage.asideTitle")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          {t("servicesPage.asideText")}
        </p>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-400">
          {t("servicesPage.asideNote")}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/#servicios" className="btn-blue">
            {t("servicesPage.startOrder")}
          </Link>
          <Link to="/contacto" className="btn-outline">
            {t("servicesPage.requestHelp")}
          </Link>
        </div>
      </aside>
    </PageShell>
  );
}
