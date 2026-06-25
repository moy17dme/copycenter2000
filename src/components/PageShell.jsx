import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import Seo from "./Seo";
import { useLocale } from "../i18n/LocaleContext";

export default function PageShell({
  path,
  eyebrow,
  title,
  intro,
  breadcrumbLabel = title,
  breadcrumbs: breadcrumbItems,
  structuredData,
  children,
  width = "max-w-6xl",
}) {
  const { t } = useLocale();
  const breadcrumbs = breadcrumbItems || [{ label: breadcrumbLabel, path }];

  return (
    <main className="relative z-10 flex-1 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <Seo
        path={path}
        breadcrumbs={breadcrumbs}
        structuredData={structuredData}
      />

      <div className={`mx-auto ${width}`}>
        <nav aria-label={t("pageShell.breadcrumbs")} className="mb-8">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="transition hover:text-white">
                {t("pageShell.home")}
              </Link>
            </li>
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={item.path} className="contents">
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  {isLast ? (
                    <span aria-current="page" className="text-slate-300">
                      {item.label}
                    </span>
                  ) : (
                    <Link
                      to={item.path}
                      className="transition hover:text-white"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <header className="border-b border-border pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            {intro}
          </p>
        </header>

        {children}
      </div>
    </main>
  );
}
