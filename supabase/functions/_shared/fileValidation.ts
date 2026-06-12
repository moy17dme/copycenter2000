const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
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

export type PrintableFileType = {
  extension: "pdf" | "png" | "jpg";
  mimeType: "application/pdf" | "image/png" | "image/jpeg";
};

function ascii(bytes: Uint8Array, start = 0, end = bytes.length) {
  return new TextDecoder("latin1").decode(bytes.subarray(start, end));
}

function hasBytes(bytes: Uint8Array, offset: number, expected: number[]) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function readUint32(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function isPdfWhitespace(character: string) {
  return character === "\x00" || /[\t\n\f\r ]/.test(character);
}

function isPdfDelimiter(character: string) {
  return !character || isPdfWhitespace(character) || /[()[\]{}<>/%]/.test(character);
}

function decodePdfName(value: string) {
  return value
    .replace(/#([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .toLowerCase();
}

function pdfHasBlockedName(bytes: Uint8Array) {
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

function validatePdf(bytes: Uint8Array) {
  if (bytes.length < 12 || ascii(bytes, 0, 5) !== "%PDF-") {
    return "invalid_pdf_signature";
  }
  const tail = ascii(bytes, Math.max(0, bytes.length - 8192));
  const eofIndex = tail.lastIndexOf("%%EOF");
  if (eofIndex === -1) return "incomplete_pdf";
  const afterEof = tail.slice(eofIndex + 5);
  if (afterEof.replace(/%[^\r\n]*(?:\r?\n|$)/g, "").trim().length > 0) {
    return "appended_pdf_payload";
  }

  if (pdfHasBlockedName(bytes)) {
    return "active_or_encrypted_pdf";
  }
  return null;
}

function validatePng(bytes: Uint8Array) {
  if (
    bytes.length < 45 ||
    !hasBytes(bytes, 0, [137, 80, 78, 71, 13, 10, 26, 10])
  ) {
    return "invalid_png_signature";
  }
  if (ascii(bytes, 12, 16) !== "IHDR" || readUint32(bytes, 8) !== 13) {
    return "invalid_png_header";
  }
  const width = readUint32(bytes, 16);
  const height = readUint32(bytes, 20);
  if (!width || !height || width * height > MAX_IMAGE_PIXELS) {
    return "invalid_image_dimensions";
  }
  if (ascii(bytes, bytes.length - 8, bytes.length - 4) !== "IEND") {
    return "incomplete_or_appended_png";
  }
  return null;
}

function jpegDimensions(bytes: Uint8Array) {
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

function validateJpeg(bytes: Uint8Array) {
  if (
    bytes.length < 16 ||
    !hasBytes(bytes, 0, [0xff, 0xd8, 0xff]) ||
    !hasBytes(bytes, bytes.length - 2, [0xff, 0xd9])
  ) {
    return "invalid_or_appended_jpeg";
  }
  const dimensions = jpegDimensions(bytes);
  if (
    !dimensions?.width ||
    !dimensions?.height ||
    dimensions.width * dimensions.height > MAX_IMAGE_PIXELS
  ) {
    return "invalid_image_dimensions";
  }
  return null;
}

export function validatePrintableUpload(
  fileName: string,
  bytes: Uint8Array,
  options: { pdfOnly?: boolean } = {},
) {
  if (!bytes.length) return { ok: false as const, error: "empty_file" };
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return { ok: false as const, error: "file_too_large" };
  }

  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  if (options.pdfOnly && extension !== "pdf") {
    return { ok: false as const, error: "pdf_required" };
  }

  let type: PrintableFileType | null = null;
  let error: string | null = null;
  if (extension === "pdf") {
    type = { extension: "pdf", mimeType: "application/pdf" };
    error = validatePdf(bytes);
  } else if (extension === "png") {
    type = { extension: "png", mimeType: "image/png" };
    error = validatePng(bytes);
  } else if (extension === "jpg" || extension === "jpeg") {
    type = { extension: "jpg", mimeType: "image/jpeg" };
    error = validateJpeg(bytes);
  } else {
    return { ok: false as const, error: "unsupported_file_type" };
  }

  if (error) return { ok: false as const, error };
  return { ok: true as const, type };
}

export { MAX_UPLOAD_BYTES };
