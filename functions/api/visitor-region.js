const SPANISH_COUNTRIES = new Set([
  "AR",
  "BO",
  "CL",
  "CO",
  "CR",
  "CU",
  "DO",
  "EC",
  "ES",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PE",
  "PR",
  "PY",
  "SV",
  "UY",
  "VE",
]);

function localeForCountry(countryCode) {
  const country = String(countryCode || "").trim().toUpperCase();
  if (country === "US" || country === "CA" || country === "GB") return "en";
  if (SPANISH_COUNTRIES.has(country)) return "es";
  return "es";
}

export async function onRequestGet({ request }) {
  const cfCountry = request.cf?.country;
  const headerCountry = request.headers.get("CF-IPCountry");
  const country = String(cfCountry || headerCountry || "XX").toUpperCase();

  return Response.json(
    {
      country,
      locale: localeForCountry(country),
      source: cfCountry ? "cloudflare-request" : headerCountry ? "cloudflare-header" : "unknown",
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
