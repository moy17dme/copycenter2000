import fs from "node:fs";
import path from "node:path";

function readDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  const raw = fs.readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
  }

  return env;
}

function requireValue(env, name) {
  const value = env[name] || process.env[name] || "";
  if (!value || value.startsWith("YOUR_")) {
    throw new Error(`Falta ${name}.`);
  }
  return value;
}

const root = process.cwd();
const localEnv = readDotEnv(path.join(root, ".env"));
const projectRef =
  process.env.SUPABASE_PROJECT_REF ||
  localEnv.SUPABASE_PROJECT_REF ||
  fs.readFileSync(path.join(root, "supabase", ".temp", "project-ref"), "utf8").trim();

const accessToken = requireValue(localEnv, "SUPABASE_ACCESS_TOKEN");
const googleClientId = requireValue(localEnv, "GOOGLE_OAUTH_CLIENT_ID");
const googleClientSecret = requireValue(localEnv, "GOOGLE_OAUTH_CLIENT_SECRET");
const siteUrl = process.env.GOOGLE_AUTH_SITE_URL || localEnv.GOOGLE_AUTH_SITE_URL || "https://copycenter2000.com";
const redirectUrls = (
  process.env.GOOGLE_AUTH_REDIRECT_URLS ||
  localEnv.GOOGLE_AUTH_REDIRECT_URLS ||
  [
    "https://copycenter2000.com/auth/callback",
    "https://copycenter2000.com/auth/callback/",
    "http://localhost:5173/auth/callback",
    "http://localhost:5173/auth/callback/",
  ].join(",")
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const payload = {
  site_url: siteUrl,
  uri_allow_list: redirectUrls.join(","),
  external_google_enabled: true,
  external_google_client_id: googleClientId,
  external_google_secret: googleClientSecret,
};

const response = await fetch(
  `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  },
);

if (!response.ok) {
  const text = await response.text();
  throw new Error(`Supabase no pudo activar Google (${response.status}): ${text}`);
}

const supabaseUrl = requireValue(localEnv, "VITE_SUPABASE_URL").replace(/\/+$/, "");
const anonKey = requireValue(localEnv, "VITE_SUPABASE_ANON_KEY");
const settingsResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
  headers: { apikey: anonKey },
});
const settings = await settingsResponse.json().catch(() => ({}));

console.log(
  JSON.stringify({
    projectRef,
    google_enabled: settings?.external?.google === true,
    site_url: siteUrl,
    redirect_urls: redirectUrls.length,
  }),
);
