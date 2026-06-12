import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  getCanonicalUrl,
  PUBLIC_ROUTE_SEO,
  SITE_URL,
} from "../src/data/seoRoutes.js";

const distDir = join(process.cwd(), "dist");
const template = await readFile(join(distDir, "index.html"), "utf8");
const serverEntry = pathToFileURL(
  join(process.cwd(), "dist-ssr", "entry-server.js"),
).href;
const { render } = await import(serverEntry);

const pageTypes = {
  "/acerca-de": "AboutPage",
  "/contacto": "ContactPage",
  "/portafolio": "CollectionPage",
  "/recursos": "CollectionPage",
  "/recursos/como-preparar-archivos-para-imprimir": "Article",
};

const breadcrumbLabels = {
  "/servicios": "Servicios",
  "/precios": "Precios",
  "/acerca-de": "Acerca de",
  "/preguntas-frecuentes": "Preguntas frecuentes",
  "/contacto": "Contacto",
  "/portafolio": "Portafolio",
  "/recursos": "Recursos",
  "/recursos/como-preparar-archivos-para-imprimir": "Preparar archivos",
  "/aviso-privacidad": "Aviso de privacidad",
  "/terminos": "Términos y condiciones",
};

const functionalRoutes = {
  "/auth/callback": {
    title: "Conectando cuenta | Copy Center 2000",
    description: "Retorno seguro de autenticacion de Copy Center 2000.",
  },
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html)
    ? html.replace(pattern, replacement)
    : html.replace("</head>", `    ${replacement}\n  </head>`);
}

function buildBreadcrumbs(path) {
  if (path === "/") return [];

  const items = [{ label: "Inicio", path: "/" }];
  if (path.startsWith("/recursos/")) {
    items.push({ label: "Recursos", path: "/recursos" });
  }
  items.push({
    label: breadcrumbLabels[path] || path.split("/").filter(Boolean).at(-1),
    path,
  });
  return items;
}

function buildRouteSchema(path, seo) {
  const canonical = getCanonicalUrl(path);
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": pageTypes[path] || "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: seo.title,
      description: seo.description,
      inLanguage: "es-MX",
      isPartOf: {
        "@id": `${SITE_URL}/#website`,
      },
      about: {
        "@id": `${SITE_URL}/#localbusiness`,
      },
      ...(path === "/recursos/como-preparar-archivos-para-imprimir"
        ? {
            datePublished: "2026-06-10",
            dateModified: "2026-06-10",
            author: {
              "@type": "Organization",
              name: "Copy Center 2000",
              url: getCanonicalUrl("/acerca-de"),
            },
            publisher: {
              "@id": `${SITE_URL}/#localbusiness`,
            },
          }
        : {}),
    },
  ];

  const breadcrumbs = buildBreadcrumbs(path);
  if (breadcrumbs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
        item: getCanonicalUrl(item.path),
      })),
    });
  }

  return schemas;
}

function renderRouteHtml(
  path,
  seo,
  { includeSchema = true, noindex = false, prerender = true } = {},
) {
  const title = escapeHtml(seo.title);
  const description = escapeHtml(seo.description);
  const canonical = getCanonicalUrl(path);
  const appHtml = prerender ? render(path) : "";

  let html = template.replace(/<title>.*?<\/title>/s, `<title>${title}</title>`);
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${appHtml}</div>`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${description}" />`,
  );
  html = replaceTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonical}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${canonical}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${title}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${description}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${title}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${description}" />`,
  );
  if (noindex) {
    html = replaceTag(
      html,
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
      '<meta name="robots" content="noindex, nofollow" />',
    );
  }

  if (!includeSchema) return html;

  const schemaScripts = buildRouteSchema(path, seo)
    .map(
      (schema) =>
        `<script type="application/ld+json" data-route-seo="true">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>`,
    )
    .join("\n    ");

  return html.replace("</head>", `    ${schemaScripts}\n  </head>`);
}

async function writeRoute(path, html) {
  const outputPath =
    path === "/"
      ? join(distDir, "index.html")
      : join(distDir, path.slice(1), "index.html");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
}

for (const [path, seo] of Object.entries(PUBLIC_ROUTE_SEO)) {
  await writeRoute(path, renderRouteHtml(path, seo));
}

for (const [path, seo] of Object.entries(functionalRoutes)) {
  await writeRoute(
    path,
    renderRouteHtml(path, seo, {
      includeSchema: false,
      noindex: true,
      prerender: false,
    }),
  );
}

console.log(
  `Prerendered ${Object.keys(PUBLIC_ROUTE_SEO).length} public routes and ${Object.keys(functionalRoutes).length} functional routes.`,
);
