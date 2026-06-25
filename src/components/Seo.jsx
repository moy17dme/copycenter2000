import { useEffect } from "react";
import {
  getCanonicalUrl,
  PUBLIC_ROUTE_SEO,
  SITE_URL,
} from "../data/seoRoutes";
import { useLocale } from "../i18n/LocaleContext";

const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function upsertCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function getSeoKey(path) {
  if (path === "/") return "home";
  if (path === "/servicios") return "services";
  if (path === "/precios") return "prices";
  if (path === "/contacto") return "contact";
  return "";
}

function buildBreadcrumbData(breadcrumbs, homeLabel) {
  if (!breadcrumbs?.length) return null;

  const items = [
    { label: homeLabel, path: "/" },
    ...breadcrumbs,
  ];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: getCanonicalUrl(item.path),
    })),
  };
}

export default function Seo({
  path = "/",
  title,
  description,
  image = DEFAULT_IMAGE,
  noindex = false,
  breadcrumbs = [],
  structuredData,
}) {
  const { htmlLang, t } = useLocale();

  useEffect(() => {
    const routeSeo = PUBLIC_ROUTE_SEO[path] || PUBLIC_ROUTE_SEO["/"];
    const seoKey = getSeoKey(path);
    const pageTitle = title || (seoKey ? t(`seo.${seoKey}.title`, {}, routeSeo.title) : routeSeo.title);
    const pageDescription = description || (seoKey ? t(`seo.${seoKey}.description`, {}, routeSeo.description) : routeSeo.description);
    const canonicalUrl = getCanonicalUrl(path);

    document.title = pageTitle;
    upsertMeta('meta[name="description"]', {
      name: "description",
      content: pageDescription,
    });
    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: noindex ? "noindex, nofollow" : "index, follow",
    });
    upsertMeta('meta[property="og:type"]', {
      property: "og:type",
      content: "website",
    });
    upsertMeta('meta[property="og:url"]', {
      property: "og:url",
      content: canonicalUrl,
    });
    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: pageTitle,
    });
    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: pageDescription,
    });
    upsertMeta('meta[property="og:image"]', {
      property: "og:image",
      content: image,
    });
    upsertMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: pageTitle,
    });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: pageDescription,
    });
    upsertCanonical(canonicalUrl);

    document.head
      .querySelectorAll('script[data-route-seo="true"]')
      .forEach((script) => script.remove());

    const schema = [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: pageTitle,
        description: pageDescription,
        inLanguage: htmlLang,
        isPartOf: {
          "@id": `${SITE_URL}/#website`,
        },
        about: {
          "@id": `${SITE_URL}/#localbusiness`,
        },
      },
      buildBreadcrumbData(breadcrumbs, t("pageShell.home")),
      ...(Array.isArray(structuredData)
        ? structuredData
        : structuredData
          ? [structuredData]
          : []),
    ].filter(Boolean);

    schema.forEach((data) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.routeSeo = "true";
      script.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
      document.head.appendChild(script);
    });

    return () => {
      document.head
        .querySelectorAll('script[data-route-seo="true"]')
        .forEach((script) => script.remove());
    };
  }, [
    breadcrumbs,
    description,
    htmlLang,
    image,
    noindex,
    path,
    structuredData,
    t,
    title,
  ]);

  return null;
}
