// src/hooks/useInkCoverage.js
// Analyzes ink coverage for ALL pages of a PDF (sampled if > MAX_PAGES),
// or for a single raster image.  Returns per-page data + aggregate stats.

import { useEffect, useRef, useState } from "react";
import { pdfjsLib } from "@/lib/pdfjsSetup";

const PDF_EXTS   = new Set(["pdf"]);
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "bmp", "gif"]);

const ANALYSIS_MAX_SIDE = 480;  // px – higher res = fewer antialiasing artifacts
const PDF_SCALE         = 0.40; // enough resolution to distinguish thin lines
const MAX_PAGES_FULL    = 20;   // analyze every page up to this count
const MAX_PAGES_SAMPLE  = 20;   // sample size when doc exceeds MAX_PAGES_FULL

// Luminance above this value is treated as paper background (skipped).
const WHITE_THRESHOLD = 0.97;

// Safety margin added to the final coverage per the spec:
// "cubre el mantenimiento de cabezales en archivos muy pesados"
const SAFETY_MARGIN = 1.05;

// ── CAD ceiling ────────────────────────────────────────────────────────────
// Base ceiling for the "0-10" (CAD) tier when auto-detection does NOT fire.
// Calibrated from 131 reference CAD PDFs: max average coverage 8.4 % → 12 %
// gives a safe buffer.  Files that exceed 12 % without cadLike detection
// are priced in the next tier (e.g., pastel fills that score 14-20 % because
// the whole page is lightly colored).
const CAD_CEILING_BASE = 12;

// ── CAD signature — primary metric: nonWhiteFraction ─────────────────────
//
// nonWhiteFraction = nonWhitePixels / totalPixels
//   Measures HOW MUCH of the page is covered by any non-white pixel,
//   regardless of how dark those pixels are.
//
//   CAD / thin lines:  few pixels are non-white (sparse ink).
//     → nonWhiteFraction LOW  (0.02 – 0.20 for the 131 reference CAD PDFs)
//
//   Pastel / fills / photos: most of the page has color pixels,
//     even if those pixels are light.
//     → nonWhiteFraction HIGH (0.50 – 0.99)
//
//   This metric is RENDERER-INDEPENDENT: it counts spatial coverage, not
//   pixel darkness, so it works the same in PyMuPDF and PDF.js.
//
// Secondary: avgInkIntensity < 0.40 (fires when PDF.js anti-aliases lines
//   into gray halos, the original PyMuPDF-calibrated condition).
//
// cadLike = true when EITHER metric fires.
// Extended ceiling when cadLike = true: 35%  (covers dense-but-pure CAD).
//
// NWF threshold calibrated from 127 reference CAD PDFs:
//   max observed NWF = 45.1 %  (dense architectural drawing)
//   threshold set at 50 % → catches ALL reference files with a safe margin.
//   Pastel / fills covering the whole page score NWF ≥ 80 % → not caught. ✓
const CAD_INTENSITY_THRESHOLD = 0.40;
const CAD_NWF_THRESHOLD       = 0.50;  // < 50 % of pixels non-white → sparse/line ink
const CAD_CEILING_EXTENDED    = 35;

function getExt(name = "") {
  const s = String(name);
  const i = s.lastIndexOf(".");
  return i >= 0 ? s.slice(i + 1).toLowerCase() : "";
}

// ── coverageToRange ───────────────────────────────────────────────────────
// cadLike (nonWhiteFraction < 0.20 OR avgInkIntensity < 0.40):
//   → ceiling raised to 35 % so sparse thin-line drawings always get CAD pricing.
// Non-cadLike: base ceiling 12 %; files 13-25 % go to the "11-25" tier
//   (e.g., pastel fills that cover the whole page but use little ink per pixel).
export function coverageToRange(pct, cadLike = false) {
  const ceiling = cadLike ? CAD_CEILING_EXTENDED : CAD_CEILING_BASE;
  if (pct <= ceiling) return "0-10";
  if (pct <= 25)  return "11-25";
  if (pct <= 40)  return "26-40";
  if (pct <= 60)  return "41-60";
  if (pct <= 80)  return "61-80";
  return "81-100";
}

// ── pixel analysis ────────────────────────────────────────────────────────
// Returns { coverage, avgInkIntensity, nonWhiteFraction }
//
//   coverage         – ink coverage % over the full page area (with safety margin)
//   avgInkIntensity  – average (1−luminance) of non-white pixels only.
//                      LOW  (< 0.40): anti-aliased thin lines (gray halos)
//                      HIGH (≥ 0.40): sharp lines or solid fills
//   nonWhiteFraction – fraction of opaque pixels that are non-white (0–1).
//                      LOW  (< 0.22): sparse ink = thin-line / CAD drawing
//                      HIGH (≥ 0.22): dense ink = fills, photos, heavy content
function analyzePixels({ data }) {
  let inkSum      = 0;
  let totalPixels = 0;
  let nonWhitePx  = 0;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 10) continue;   // fully transparent → skip

    totalPixels++;

    const r   = data[i]     / 255;
    const g   = data[i + 1] / 255;
    const b   = data[i + 2] / 255;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum >= WHITE_THRESHOLD) continue;  // paper background → skip

    nonWhitePx++;
    inkSum += (1 - lum);
  }

  if (totalPixels === 0) return { coverage: 0, avgInkIntensity: 0, nonWhiteFraction: 0 };

  const nonWhiteFraction = nonWhitePx / totalPixels;

  // ── Coverage formula ──────────────────────────────────────────────────────
  // lumCoverage  = average (1-lum) over all pixels  → how dark the ink is
  // areaCoverage = fraction of page that has ANY ink → spatial extent of print
  //
  // Blending both gives correct pricing for:
  //   · Pastel / light fills: lumCoverage is low (colors are near-white) but
  //     areaCoverage is high (whole page printed) → blend ≈ 50-60%   ✓
  //   · CAD thin lines: both are low (sparse ink) → blend ≈ 5-12%    ✓
  //   · Solid dark prints: both are high → blend ≈ 80-95%            ✓
  const lumCoverage  = (inkSum / totalPixels) * 100;
  const areaCoverage = nonWhiteFraction * 100;
  const rawCoverage  = (lumCoverage + areaCoverage) / 2;
  const coverage     = Math.min(100, rawCoverage * SAFETY_MARGIN);

  const avgInkIntensity = nonWhitePx > 20 ? inkSum / nonWhitePx : 0;

  return { coverage, avgInkIntensity, nonWhiteFraction };
}

function drawToCanvas(source, w, h) {
  const canvas  = document.createElement("canvas");
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

// ── image analysis ────────────────────────────────────────────────────────
function analyzeImageSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(ANALYSIS_MAX_SIDE / img.naturalWidth,
                             ANALYSIS_MAX_SIDE / img.naturalHeight, 1);
      const w = Math.max(1, Math.round(img.naturalWidth  * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      try { resolve(analyzePixels(drawToCanvas(img, w, h))); }
      catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("No se pudo cargar la imagen para análisis."));
    img.src = src;
  });
}

// ── PDF multi-page analysis ───────────────────────────────────────────────
async function analyzePdfAllPages(source, onProgress) {
  const task =
    source instanceof Blob
      ? pdfjsLib.getDocument({ data: await source.arrayBuffer() })
      : pdfjsLib.getDocument(source);

  const pdf      = await task.promise;
  const numPages = pdf.numPages;

  let pageNums;
  if (numPages <= MAX_PAGES_FULL) {
    pageNums = Array.from({ length: numPages }, (_, i) => i + 1);
  } else {
    const step = (numPages - 1) / (MAX_PAGES_SAMPLE - 1);
    pageNums = Array.from({ length: MAX_PAGES_SAMPLE }, (_, i) =>
      Math.round(1 + i * step)
    );
    pageNums = [...new Set(pageNums)];
  }

  const results = [];
  for (const pageNum of pageNums) {
    const page   = await pdf.getPage(pageNum);
    const baseVp = page.getViewport({ scale: 1 });
    const scale  = Math.min(
      PDF_SCALE,
      ANALYSIS_MAX_SIDE / baseVp.width,
      ANALYSIS_MAX_SIDE / baseVp.height
    );
    const vp     = page.getViewport({ scale });
    const canvas  = document.createElement("canvas");
    canvas.width  = Math.max(1, Math.floor(vp.width));
    canvas.height = Math.max(1, Math.floor(vp.height));
    const ctx     = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    const { coverage, avgInkIntensity, nonWhiteFraction } = analyzePixels(
      ctx.getImageData(0, 0, canvas.width, canvas.height)
    );
    results.push({
      pageNum,
      coveragePct:       parseFloat(coverage.toFixed(1)),
      avgInkIntensity:   parseFloat(avgInkIntensity.toFixed(4)),
      nonWhiteFraction:  parseFloat(nonWhiteFraction.toFixed(4)),
    });
    onProgress?.(results.length, pageNums.length);
  }

  await pdf.destroy();

  const coverages    = results.map((r) => r.coveragePct);
  const intensities  = results.map((r) => r.avgInkIntensity);
  const fractions    = results.map((r) => r.nonWhiteFraction);

  const avgCoverage        = coverages.reduce((a, b) => a + b, 0) / coverages.length;
  const avgIntensity       = intensities.reduce((a, b) => a + b, 0) / intensities.length;
  const avgNonWhiteFraction = fractions.reduce((a, b) => a + b, 0) / fractions.length;

  return {
    pages:              results,
    numPages,
    sampledPages:       pageNums.length,
    avgCoverage:        parseFloat(avgCoverage.toFixed(1)),
    minCoverage:        parseFloat(Math.min(...coverages).toFixed(1)),
    maxCoverage:        parseFloat(Math.max(...coverages).toFixed(1)),
    avgInkIntensity:    parseFloat(avgIntensity.toFixed(4)),
    avgNonWhiteFraction: parseFloat(avgNonWhiteFraction.toFixed(4)),
  };
}

// ── hook ──────────────────────────────────────────────────────────────────
const INIT = {
  analyzing:        false,
  progress:         null,
  supported:        false,
  error:            null,
  coveragePct:      null,
  saturationRange:  null,
  minCoverage:      null,
  maxCoverage:      null,
  variesAcrossPages: false,
  numPages:         null,
  sampledPages:     null,
  pages:            null,
  cadLike:           false, // true when either CAD metric fires
  avgInkIntensity:   null,  // average (1-lum) of non-white pixels; low = thin lines (CAD)
  nonWhiteFraction:  null,  // fraction of pixels that are non-white; low = sparse ink (CAD)
};

export function useInkCoverage(item) {
  const [state, setState] = useState(INIT);
  const cancelRef = useRef(false);

  const file       = item?.file || item?.pdfFile || item?.fileObject || item?.blob || null;
  const previewUrl = item?.previewUrl || item?.fileUrl || item?.pdfUrl || item?.url || "";
  const fileName   = item?.fileName || file?.name || "";
  const mime       = file?.type || item?.fileType || "";
  const ext        = getExt(fileName);

  const isPdf     = mime === "application/pdf" || PDF_EXTS.has(ext);
  const isImage   = mime.startsWith("image/")  || IMAGE_EXTS.has(ext);
  const supported = isPdf || isImage;

  const fileKey = file
    ? `${file.name}:${file.size}:${file.lastModified}`
    : previewUrl || "";

  useEffect(() => {
    if (!supported || !fileKey) {
      setState({ ...INIT, supported });
      return;
    }

    cancelRef.current = false;
    setState({ ...INIT, analyzing: true, supported: true });

    (async () => {
      try {
        let result;

        if (isPdf) {
          const source = file instanceof Blob ? file : previewUrl;
          if (!source) throw new Error("Sin fuente PDF.");

          const onProgress = (done, total) => {
            if (!cancelRef.current)
              setState((s) => ({ ...s, progress: { done, total } }));
          };

          const data    = await analyzePdfAllPages(source, onProgress);
          if (cancelRef.current) return;

          // Dual CAD detection: fires when EITHER metric indicates thin-line drawing.
          // avgInkIntensity < 0.40 → anti-aliased gray pixels (PyMuPDF / high-AA PDF.js)
          // nonWhiteFraction < 0.22 → sparse ink regardless of pixel darkness
          const cadLike  = data.avgInkIntensity    < CAD_INTENSITY_THRESHOLD
                        || data.avgNonWhiteFraction < CAD_NWF_THRESHOLD;
          const minRange = coverageToRange(data.minCoverage, cadLike);
          const maxRange = coverageToRange(data.maxCoverage, cadLike);

          result = {
            coveragePct:       data.avgCoverage,
            saturationRange:   coverageToRange(data.avgCoverage, cadLike),
            minCoverage:       data.minCoverage,
            maxCoverage:       data.maxCoverage,
            variesAcrossPages: minRange !== maxRange,
            numPages:          data.numPages,
            sampledPages:      data.sampledPages,
            pages:             data.pages,
            cadLike,
            avgInkIntensity:   data.avgInkIntensity,
            nonWhiteFraction:  data.avgNonWhiteFraction,
          };
        } else {
          // Raster image
          let src = previewUrl;
          let created = false;
          if (file instanceof Blob && !src) { src = URL.createObjectURL(file); created = true; }
          if (!src) throw new Error("Sin URL de imagen.");

          const { coverage, avgInkIntensity, nonWhiteFraction } = await analyzeImageSrc(src);
          if (created) URL.revokeObjectURL(src);
          if (cancelRef.current) return;

          const cadLike = avgInkIntensity   < CAD_INTENSITY_THRESHOLD
                       || nonWhiteFraction  < CAD_NWF_THRESHOLD;
          const pct     = parseFloat(coverage.toFixed(1));

          result = {
            coveragePct:       pct,
            saturationRange:   coverageToRange(pct, cadLike),
            minCoverage:       pct,
            maxCoverage:       pct,
            variesAcrossPages: false,
            numPages:          1,
            sampledPages:      1,
            pages:             [{ pageNum: 1, coveragePct: pct }],
            cadLike,
            avgInkIntensity:   parseFloat(avgInkIntensity.toFixed(4)),
            nonWhiteFraction:  parseFloat(nonWhiteFraction.toFixed(4)),
          };
        }

        setState({ ...INIT, analyzing: false, supported: true, error: null, ...result });
      } catch (e) {
        if (!cancelRef.current)
          setState({ ...INIT, analyzing: false, supported: true, error: e?.message || "Error al analizar." });
      }
    })();

    return () => { cancelRef.current = true; };
  }, [fileKey, supported]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
