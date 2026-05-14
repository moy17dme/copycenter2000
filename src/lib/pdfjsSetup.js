// src/lib/pdfjsSetup.js
// Single source of truth for PDF.js worker configuration.
// Import this (or pdfjsLib from here) wherever PDF.js is needed.
import * as pdfjsLib from "pdfjs-dist";

const pdfWorker = new Worker(
  new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
  { type: "module" }
);
pdfjsLib.GlobalWorkerOptions.workerPort = pdfWorker;

export { pdfjsLib };
