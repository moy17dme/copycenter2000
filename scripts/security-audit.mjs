import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const serverSecretNames = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "MP_ACCESS_TOKEN",
  "MP_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "TWILIO_AUTH_TOKEN",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "SUPABASE_ACCESS_TOKEN",
];
const publicClientNames = [
  "VITE_SUPABASE_ANON_KEY",
  "VITE_MP_PUBLIC_KEY",
];
const errors = [];

function parseEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
  );
}

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
    ...options,
  });
}

function textFilesUnder(path) {
  if (!existsSync(path)) return [];
  const result = [];
  for (const entry of readdirSync(path)) {
    if ([".git", ".temp", "node_modules", "dist", "dist-ssr"].includes(entry)) continue;
    const fullPath = join(path, entry);
    if (statSync(fullPath).isDirectory()) result.push(...textFilesUnder(fullPath));
    else result.push(fullPath);
  }
  return result;
}

const env = parseEnv(join(root, ".env"));
const trackedFiles = git(["ls-files", "-z"])
  .split("\0")
  .filter(Boolean)
  .map((path) => join(root, path));
const workspaceSourceFiles = [
  ...textFilesUnder(join(root, "src")),
  ...textFilesUnder(join(root, "supabase")),
  ...textFilesUnder(join(root, "scripts")),
  ...textFilesUnder(join(root, "public")),
  join(root, "package.json"),
  join(root, ".env.example"),
].filter(existsSync);
const buildFiles = [
  ...textFilesUnder(join(root, "dist")),
  ...textFilesUnder(join(root, "dist-ssr")),
];
const filesToScan = [...new Set([...trackedFiles, ...workspaceSourceFiles, ...buildFiles])];
let gitHistory = "";
try {
  gitHistory = git(["log", "--all", "-p", "--format="]);
} catch {
  errors.push("No se pudo revisar todo el historial Git.");
}

try {
  git(["ls-files", "--error-unmatch", ".env"], { stdio: "pipe" });
  errors.push(".env esta rastreado por Git.");
} catch {
  // Correcto: .env no debe estar rastreado.
}

for (const name of serverSecretNames) {
  const value = env[name];
  if (!value || value.startsWith("YOUR_") || value.length < 16) {
    console.log(`[security] ${name}: no configurado localmente`);
    continue;
  }

  const leakedFiles = filesToScan.filter((path) => {
    try {
      return readFileSync(path).includes(Buffer.from(value));
    } catch {
      return false;
    }
  });
  if (leakedFiles.length) {
    errors.push(
      `${name} aparece en: ${leakedFiles
        .map((path) => relative(root, path))
        .join(", ")}`
    );
  }

  if (gitHistory.includes(value)) {
    errors.push(`${name} aparece en el historial Git.`);
  }
  console.log(`[security] ${name}: sin exposicion detectada`);
}

for (const name of publicClientNames) {
  console.log(
    `[security] ${name}: ${env[name] ? "configurado (clave publica esperada)" : "no configurado"}`
  );
}

const sourceFiles = [...new Set([...trackedFiles, ...workspaceSourceFiles])].filter((path) =>
  /\.(?:js|jsx|mjs|ts|tsx|json|toml|sql|md)$/i.test(path) &&
  existsSync(path) &&
  !path.endsWith(join("scripts", "security-audit.mjs"))
);
const sourceText = sourceFiles
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

for (const forbiddenName of [
  "VITE_SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SERVICE_ROLE_KEY",
  "VITE_MP_ACCESS_TOKEN",
  "VITE_MP_WEBHOOK_SECRET",
  "VITE_RESEND_API_KEY",
  "VITE_TWILIO_AUTH_TOKEN",
  "VITE_GOOGLE_OAUTH_CLIENT_SECRET",
  "VITE_SUPABASE_ACCESS_TOKEN",
]) {
  if (sourceText.includes(forbiddenName)) {
    errors.push(`Nombre de secreto inseguro detectado: ${forbiddenName}`);
  }
}

const clientSourceText = sourceFiles
  .filter((path) => path.includes(`${join("src", "")}`))
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");
if (/storage\s*\.\s*from\(\s*["']order-files["']\s*\)\s*\.\s*upload/s.test(clientSourceText)) {
  errors.push("Hay una subida directa al bucket order-files que evita la inspeccion del servidor.");
}
for (const requiredFunction of [
  "[functions.upload-order-file]",
  "[functions.notify-admin-order]",
]) {
  if (!sourceText.includes(requiredFunction)) {
    errors.push(`La Edge Function ${requiredFunction} no esta registrada.`);
  }
}
if (!sourceText.includes("checkRateLimit(")) {
  errors.push("No se encontro el rate limiting de Edge Functions.");
}

if (errors.length) {
  console.error("\nAuditoria de seguridad FALLIDA:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("\nAuditoria de seguridad correcta.");
}
