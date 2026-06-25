import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_CONFIG,
  getLocaleForCountry,
  getLocaleForNavigator,
  normalizeLocale,
  translate,
} from "./translations";

const STORAGE_KEY = "cc2000.locale";
const LocaleContext = createContext(null);

function readStoredLocale() {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeLocale(stored) : null;
  } catch {
    return null;
  }
}

async function fetchVisitorRegion() {
  if (typeof window === "undefined") return null;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 1400);

  try {
    const response = await fetch("/api/visitor-region", {
      credentials: "same-origin",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("application/json")) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [region, setRegion] = useState({
    country: "",
    source: "default",
  });

  const setLocale = useCallback((nextLocale) => {
    const normalized = normalizeLocale(nextLocale);
    setLocaleState(normalized);
    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // The choice remains active for this session if storage is blocked.
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const stored = readStoredLocale();
    if (stored) setLocaleState(stored);

    fetchVisitorRegion().then((data) => {
      if (!alive) return;

      const country = data?.country || "";
      const detectedLocale =
        data?.locale
          ? normalizeLocale(data.locale)
          : country
            ? getLocaleForCountry(country)
            : getLocaleForNavigator(window.navigator?.language);

      setRegion({
        country,
        source: data?.source || (country ? "cloudflare" : "browser"),
      });

      if (!stored) {
        setLocaleState(detectedLocale);
      }
    });

    return () => {
      alive = false;
    };
    // Run once on boot. Later manual language changes are handled by setLocale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const config = LOCALE_CONFIG[locale] || LOCALE_CONFIG[DEFAULT_LOCALE];
    if (typeof document !== "undefined") {
      document.documentElement.lang = config.htmlLang;
      document.documentElement.dataset.locale = locale;
      if (region.country) document.documentElement.dataset.country = region.country;
    }
  }, [locale, region.country]);

  const value = useMemo(() => {
    const config = LOCALE_CONFIG[locale] || LOCALE_CONFIG[DEFAULT_LOCALE];
    return {
      locale,
      htmlLang: config.htmlLang,
      currency: config.currency,
      region,
      setLocale,
      t: (key, params, fallback) => translate(locale, key, params, fallback),
    };
  }, [locale, region, setLocale]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}
