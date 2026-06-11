// src/lib/pdfjsSetup.js
// Single source of truth for PDF.js worker configuration.
// Import this (or pdfjsLib from here) wherever PDF.js is needed.
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

if (typeof Worker !== "undefined") {
  const pdfWorker = new Worker(
    new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url),
    { type: "module" }
  );
  pdfjsLib.GlobalWorkerOptions.workerPort = pdfWorker;
}

export { pdfjsLib };
