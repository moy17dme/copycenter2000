// src/utils/fileGuards.js
export const OFFICE_BLOCK_MESSAGE =
  "ESTÁS INTENTANDO SUBIR UN ARCHIVO DE LA PAQUERA DE OFFICE, MEJOR FAVOR DE CONVERTIR A PDF PARA UNA MEJOR GESTIÓN";

const OFFICE_EXTS = new Set(["doc","docx","xls","xlsx","ppt","pptx"]);

export function getExt(name = "") {
  const s = String(name);
  const i = s.lastIndexOf(".");
  return i >= 0 ? s.slice(i + 1).toLowerCase() : "";
}

export function isOfficeFile(fileOrName) {
  const name =
    typeof fileOrName === "string"
      ? fileOrName
      : (fileOrName?.name || "");
  return OFFICE_EXTS.has(getExt(name));
}
