export const LEGAL_TERMS_VERSION = "terms-2026-06-23";
export const ACCOUNT_TERMS_ACCEPTANCE_METHOD = "account_signup_checkbox";
export const FILE_UPLOAD_CONTRACT_VERSION = "file-responsibility-2026-06-23";

export const ACCOUNT_TERMS_STATEMENT =
  "Acepto los terminos y condiciones, el aviso de privacidad y la politica de archivos de Copy Center 2000.";

export const FILE_UPLOAD_RESPONSIBILITY_STATEMENT =
  "Declaro que soy titular de los derechos o cuento con autorizacion suficiente para subir, almacenar, reproducir y solicitar el procesamiento del archivo. Acepto que soy el unico responsable del contenido y me obligo a sacar en paz y a salvo a Copy Center 2000 ante cualquier reclamacion de terceros.";

function nowIso() {
  return new Date().toISOString();
}

function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

export function buildAccountTermsMetadata(acceptedAt = nowIso()) {
  return {
    terms_accepted: true,
    terms_accepted_at: acceptedAt,
    terms_version: LEGAL_TERMS_VERSION,
    terms_acceptance_method: ACCOUNT_TERMS_ACCEPTANCE_METHOD,
    terms_statement: ACCOUNT_TERMS_STATEMENT,
  };
}

export function buildFileUploadAcceptance({
  acceptedAt,
  acceptedByName,
  acceptedByEmail,
  customerPhone,
} = {}) {
  return {
    accepted: true,
    acceptedAt: acceptedAt || nowIso(),
    acceptedByName: acceptedByName || "",
    acceptedByEmail: acceptedByEmail || "",
    customerPhone: customerPhone || "",
    contractVersion: FILE_UPLOAD_CONTRACT_VERSION,
    termsVersion: LEGAL_TERMS_VERSION,
    statement: FILE_UPLOAD_RESPONSIBILITY_STATEMENT,
    clientTimezone: getTimezone(),
  };
}
