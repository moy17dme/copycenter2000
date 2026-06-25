import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import Precios from "../components/Precios";
import { useLocale } from "../i18n/LocaleContext";

export default function PricesPage() {
  const { t } = useLocale();

  return (
    <PageShell
      path="/precios"
      eyebrow={t("pricesPage.eyebrow")}
      title={t("pricesPage.title")}
      intro={t("pricesPage.intro")}
      breadcrumbLabel={t("pricesPage.breadcrumb")}
    >
      <section className="py-10">
        <Precios />
      </section>

      <aside className="rounded-xl border border-border bg-secondary/35 p-6">
        <h2 className="text-lg font-semibold text-white">
          {t("pricesPage.beforeTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {t("pricesPage.beforeText")}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/#servicios" className="btn-blue">
            {t("pricesPage.configure")}
          </Link>
          <Link to="/preguntas-frecuentes" className="btn-outline">
            {t("pricesPage.prepareFiles")}
          </Link>
        </div>
      </aside>
    </PageShell>
  );
}
