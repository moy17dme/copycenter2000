import { Languages } from "lucide-react";
import { LOCALE_CONFIG, SUPPORTED_LOCALES } from "../../i18n/translations";
import { useLocale } from "../../i18n/LocaleContext";

export default function LanguageSwitcher({ className = "", fullWidth = false }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={[
        "inline-flex items-center rounded-lg border border-border bg-secondary/60 p-1 text-xs text-muted-foreground",
        fullWidth ? "w-full justify-between" : "",
        className,
      ].join(" ")}
      aria-label={t("locale.switcherLabel")}
      role="group"
    >
      <Languages className="mx-1 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className={["grid gap-1", fullWidth ? "grid-cols-2 flex-1" : "grid-cols-2"].join(" ")}>
        {SUPPORTED_LOCALES.map((option) => {
          const active = locale === option;
          const config = LOCALE_CONFIG[option];
          return (
            <button
              key={option}
              type="button"
              onClick={() => setLocale(option)}
              className={[
                "rounded-md px-2.5 py-1 text-xs font-semibold transition",
                active
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-white",
              ].join(" ")}
              aria-pressed={active}
              title={config.label}
            >
              {config.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
