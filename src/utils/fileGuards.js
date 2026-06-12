export const OFFICE_BLOCK_MESSAGE =
  "Estas intentando subir un archivo de Office. Conviertelo a PDF para una mejor gestion.";

const OFFICE_EXTS = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx"]);
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_FILES_PER_ORDER = 50;
export const ALLOWED_UPLOAD_EXTS = new Set(["pdf", "png", "jpg", "jpeg"]);
const MAX_IMAGE_PIXELS = 100_000_000;
const PDF_BLOCKED_NAMES = new Set([
  "javascript",
  "js",
  "launch",
  "embeddedfile",
  "embeddedfiles",
  "ef",
  "richmedia",
  "xfa",
  "encrypt",
  "submitform",
  "importdata",
]);

export function getExt(name = "") {
  const value = String(name);
  const index = value.lastIndexOf(".");
  return index >= 0 ? value.slice(index + 1).toLowerCase() : "";
}

export function isOfficeFile(fileOrName) {
  const name =
    typeof fileOrName === "string"
      ? fileOrName
      : (fileOrName?.name || "");
  return OFFICE_EXTS.has(getExt(name));
}

export function validateUploadFile(file) {
  if (!file) return "No se recibio un archivo.";
  const ext = getExt(file.name || "");
  if (!ALLOWED_UPLOAD_EXTS.has(ext)) {
    return "Solo se permiten archivos PDF, PNG o JPG/JPEG.";
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "El archivo esta vacio.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Cada archivo debe pesar 25 MB o menos.";
  }
  return null;
}

function ascii(bytes, start = 0, end = bytes.length) {
  return new TextDecoder("latin1").decode(bytes.subarray(start, end));
}

function readUint32(bytes, offset) {
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function hasBytes(bytes, offset, expected) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function isPdfWhitespace(character) {
  return character === "\x00" || /[\t\n\f\r ]/.test(character);
}

function isPdfDelimiter(character) {
  return !character || isPdfWhitespace(character) || /[()[\]{}<>/%]/.test(character);
}

function decodePdfName(value) {
  return value
    .replace(/#([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .toLowerCase();
}

function pdfHasBlockedName(bytes) {
  const source = ascii(bytes);

  for (let index = 0; index < source.length;) {
    const character = source[index];

    if (character === "%") {
      while (index < source.length && !/[\r\n]/.test(source[index])) index += 1;
      continue;
    }

    if (character === "(") {
      let depth = 1;
      index += 1;
      while (index < source.length && depth > 0) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === "(") depth += 1;
        if (source[index] === ")") depth -= 1;
        index += 1;
      }
      continue;
    }

    if (character === "<") {
      if (source[index + 1] === "<") {
        index += 2;
        continue;
      }
      const end = source.indexOf(">", index + 1);
      index = end === -1 ? source.length : end + 1;
      continue;
    }

    if (
      source.startsWith("stream", index) &&
      isPdfDelimiter(source[index - 1]) &&
      /[\r\n]/.test(source[index + 6] || "")
    ) {
      const end = source.indexOf("endstream", index + 6);
      index = end === -1 ? source.length : end + 9;
      continue;
    }

    if (character === "/") {
      let end = index + 1;
      while (end < source.length && !isPdfDelimiter(source[end])) end += 1;
      const name = decodePdfName(source.slice(index + 1, end));
      if (PDF_BLOCKED_NAMES.has(name)) return true;
      index = end;
      continue;
    }

    index += 1;
  }
  return false;
}

function validatePdfBytes(bytes) {
  if (bytes.length < 12 || ascii(bytes, 0, 5) !== "%PDF-") {
    return "El archivo no contiene una firma PDF valida.";
  }

  const tail = ascii(bytes, Math.max(0, bytes.length - 8192));
  const eofIndex = tail.lastIndexOf("%%EOF");
  if (eofIndex === -1) {
    return "El PDF esta incompleto o danado.";
  }
  const afterEof = tail.slice(eofIndex + 5);
  if (afterEof.replace(/%[^\r\n]*(?:\r?\n|$)/g, "").trim().length > 0) {
    return "El PDF contiene datos no permitidos despues de su cierre.";
  }

  if (pdfHasBlockedName(bytes)) {
    return "El PDF contiene contenido activo, adjuntos o cifrado no permitido.";
  }

  return null;
}

function validatePngBytes(bytes) {
  if (
    bytes.length < 45 ||
    !hasBytes(bytes, 0, [137, 80, 78, 71, 13, 10, 26, 10])
  ) {
    return "El archivo no contiene una firma PNG valida.";
  }
  if (ascii(bytes, 12, 16) !== "IHDR" || readUint32(bytes, 8) !== 13) {
    return "La cabecera PNG no es valida.";
  }

  const width = readUint32(bytes, 16);
  const height = readUint32(bytes, 20);
  if (!width || !height || width * height > MAX_IMAGE_PIXELS) {
    return "La imagen PNG tiene dimensiones no permitidas.";
  }
  if (ascii(bytes, bytes.length - 8, bytes.length - 4) !== "IEND") {
    return "El PNG esta incompleto o contiene datos agregados al final.";
  }

  return null;
}

function jpegDimensions(bytes) {
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd8) continue;

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame && segmentLength >= 7) {
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    offset += segmentLength;
  }
  return null;
}

function validateJpegBytes(bytes) {
  if (
    bytes.length < 16 ||
    !hasBytes(bytes, 0, [0xff, 0xd8, 0xff]) ||
    !hasBytes(bytes, bytes.length - 2, [0xff, 0xd9])
  ) {
    return "El archivo no contiene una firma JPEG valida o tiene datos agregados.";
  }

  const dimensions = jpegDimensions(bytes);
  if (
    !dimensions?.width ||
    !dimensions?.height ||
    dimensions.width * dimensions.height > MAX_IMAGE_PIXELS
  ) {
    return "La imagen JPEG tiene dimensiones no permitidas.";
  }
  return null;
}

export function inspectPrintableBytes(bytes, extension) {
  const ext = String(extension || "").toLowerCase();
  if (!(bytes instanceof Uint8Array)) {
    return "No se pudo leer el contenido del archivo.";
  }
  if (ext === "pdf") return validatePdfBytes(bytes);
  if (ext === "png") return validatePngBytes(bytes);
  if (ext === "jpg" || ext === "jpeg") return validateJpegBytes(bytes);
  return "Tipo de archivo no permitido.";
}

export async function validatePrintableFile(file, { pdfOnly = false } = {}) {
  const basicError = validateUploadFile(file);
  if (basicError) return basicError;

  const ext = getExt(file.name || "");
  if (pdfOnly && ext !== "pdf") {
    return "Este documento debe ser un PDF valido.";
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return inspectPrintableBytes(bytes, ext);
  } catch {
    return "No se pudo leer el archivo. Selecciona otro archivo.";
  }
}
