// src/components/PdfPreview.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pdfjsLib } from "@/lib/pdfjsSetup";
import { getPdfFitScale } from "../utils/pdfPreviewSizing";

const FIT_INSET = 24;

const OFFICE_EXTS  = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx"]);
const IMAGE_EXTS   = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp"]);
const PDF_EXTS     = new Set(["pdf"]);
const ALLOWED_EXTS = new Set([
  "jpg", "jpeg", "png", "tif", "tiff", "pdf",
  "hpgl2", "dwf", "plt", "gl2", "prn",
]);

function getExt(name = "") {
  const s = String(name);
  const i = s.lastIndexOf(".");
  return i >= 0 ? s.slice(i + 1).toLowerCase() : "";
}

function pickUrl(item) {
  return (
    item?.fileUrl    ||
    item?.pdfUrl     ||
    item?.previewUrl ||
    item?.publicUrl  ||
    item?.signedUrl  ||
    item?.url        ||
    item?.src        ||
    ""
  );
}

export default function PdfPreview({ item, className = "" }) {
  const file     = item?.file || item?.pdfFile || item?.fileObject || item?.blob || null;
  const url      = pickUrl(item);
  const fileName = item?.fileName || file?.name ||
    (url ? decodeURIComponent(url.split("/").pop() || "archivo") : "archivo");
  const ext  = getExt(fileName);
  const mime = file?.type || item?.mime || item?.fileType || "";

  const opts       = item?.options || {};
  const printMode  = opts.plotPrintMode ?? "all";
  const printPage  = Math.max(1, parseInt(opts.plotPrintPage)  || 1);
  const printFrom  = Math.max(1, parseInt(opts.plotPrintFrom) || 1);

  if (OFFICE_EXTS.has(ext)) {
    return (
      <div className={`h-full w-full ${className}`}>
        <div className="h-full w-full grid place-items-center p-4 text-center">
          <p className="text-sm text-amber-700 font-semibold">
            ESTÁS INTENTANDO SUBIR UN ARCHIVO DE LA PAQUETA DE OFFICE
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Mejor favor de convertir a PDF para una mejor gestión.
          </p>
        </div>
      </div>
    );
  }

  const kind = useMemo(() => {
    if (mime === "application/pdf" || PDF_EXTS.has(ext)) return "pdf";
    if (mime.startsWith("image/")  || IMAGE_EXTS.has(ext)) return "image";
    if (ALLOWED_EXTS.has(ext)) return "allowed-no-preview";
    return "other";
  }, [mime, ext]);

  const objectUrl = useMemo(() => {
    if (file instanceof Blob) return URL.createObjectURL(file);
    return "";
  }, [file]);

  useEffect(() => {
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [objectUrl]);

  const displayUrl = url || objectUrl;

  // ── refs ──────────────────────────────────────────────────────────────
  const viewRef        = useRef(null);
  const canvasRef      = useRef(null);
  const docRef         = useRef(null);
  const renderTaskRef  = useRef(null);
  const loadingTaskRef = useRef(null);
  // Referencia estable a la función renderPage (se actualiza con useCallback)
  const renderPageRef  = useRef(null);
  // Contador de llamadas: descarta renders obsoletos
  const renderCallId   = useRef(0);

  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState("");
  const [numPages, setNumPages] = useState(0);
  const [page,     setPage]     = useState(1);

  // ── Límites de navegación ─────────────────────────────────────────────
  const effectiveFrom = useMemo(() => {
    if (!numPages) return 1;
    if (printMode === "page")  return Math.min(printPage, numPages);
    if (printMode === "range") return Math.min(Math.max(1, printFrom), numPages);
    return 1;
  }, [printMode, printPage, printFrom, numPages]);

  const effectiveTo = useMemo(() => {
    if (!numPages) return 1;
    if (printMode === "page")  return Math.min(printPage, numPages);
    if (printMode === "range") {
      const to = Math.max(1, parseInt(opts.plotPrintTo) || numPages);
      return Math.min(to, numPages);
    }
    return numPages;
  }, [printMode, printPage, opts.plotPrintTo, numPages]);

  const selectedCount = Math.max(1, effectiveTo - effectiveFrom + 1);

  useEffect(() => {
    if (!numPages) return;
    setPage((p) => (p < effectiveFrom || p > effectiveTo ? effectiveFrom : p));
  }, [effectiveFrom, effectiveTo, numPages]);

  // ── destroy helpers ───────────────────────────────────────────────────
  const cancelRender = () => {
    try { renderTaskRef.current?.cancel?.(); } catch {}
    renderTaskRef.current = null;
  };

  const destroyPdf = async () => {
    cancelRender();
    if (loadingTaskRef.current) {
      try { await loadingTaskRef.current.destroy(); } catch {}
      loadingTaskRef.current = null;
    }
    if (docRef.current) {
      try { await docRef.current.destroy(); } catch {}
      docRef.current = null;
    }
  };

  // ── renderPage: lee tamaño del DOM en el momento, sin pasar por estado ─
  const renderPage = useCallback(async (targetPage) => {
    const doc    = docRef.current;
    const canvas = canvasRef.current;
    const view   = viewRef.current;
    if (!doc || !canvas || !view) return;

    // Cancelar render previo e incrementar el ID de esta llamada
    cancelRender();
    const myId = ++renderCallId.current;

    try {
      setErr("");
      const p = await doc.getPage(targetPage);
      // Si llegó una llamada más nueva mientras esperábamos, abortar silenciosamente
      if (myId !== renderCallId.current) return;

      const rect  = view.getBoundingClientRect();
      const base  = p.getViewport({ scale: 1 });
      const scale = getPdfFitScale({
        pageWidth: base.width,
        pageHeight: base.height,
        containerWidth: rect.width,
        containerHeight: rect.height,
        insetX: FIT_INSET,
        insetY: FIT_INSET,
        maxScale: 3,
      });
      const dpr      = window.devicePixelRatio || 1;
      const viewport = p.getViewport({ scale });
      const ctx      = canvas.getContext("2d", { alpha: false });
      const cssWidth = Math.max(1, Math.floor(viewport.width));
      const cssHeight = Math.max(1, Math.floor(viewport.height));

      canvas.width        = Math.max(1, Math.floor(viewport.width * dpr));
      canvas.height       = Math.max(1, Math.floor(viewport.height * dpr));
      canvas.style.width  = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      ctx.imageSmoothingEnabled = true;

      const transform = dpr === 1 ? null : [dpr, 0, 0, dpr, 0, 0];
      const task = p.render({ canvasContext: ctx, viewport, transform });
      renderTaskRef.current = task;
      await task.promise;

      // Solo limpiar si aún somos la llamada vigente
      if (myId === renderCallId.current) renderTaskRef.current = null;
    } catch (e) {
      // Ignorar: render cancelado (por nueva llamada) o documento destruido
      if (myId !== renderCallId.current) return;
      const msg = e?.message ?? "";
      const isCancelled =
        e?.name === "RenderingCancelledException" ||
        msg.toLowerCase().includes("cancel") ||
        msg.toLowerCase().includes("destroy");
      if (!isCancelled) setErr(msg || "Error renderizando PDF");
    }
  }, []);

  // Mantener renderPageRef actualizado
  useEffect(() => { renderPageRef.current = renderPage; }, [renderPage]);

  // ── Cargar PDF ────────────────────────────────────────────────────────
  useEffect(() => {
    if (kind !== "pdf") {
      destroyPdf();
      setErr(""); setLoading(false); setNumPages(0); setPage(1);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      setNumPages(0);
      setPage(1);
      await destroyPdf();
      if (cancelled) return;

      try {
        let task;
        if (file instanceof Blob) {
          const data = await file.arrayBuffer();
          if (cancelled) return;
          task = pdfjsLib.getDocument({ data });
        } else if (displayUrl) {
          task = pdfjsLib.getDocument(displayUrl);
        } else {
          throw new Error("No hay PDF para previsualizar.");
        }

        loadingTaskRef.current = task;
        const pdf = await task.promise;
        if (cancelled) return;

        docRef.current = pdf;
        const n = pdf.numPages || 0;
        setNumPages(n);
        setPage(1);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Error cargando PDF");
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, file, displayUrl]);

  // Render inicial y al cambiar de pagina. Esperar a loading=false
  // garantiza que React ya monto el canvas antes de dibujar.
  useEffect(() => {
    if (kind !== "pdf" || !docRef.current || loading || !numPages) return;
    const frame = window.requestAnimationFrame(() => renderPage(page));
    return () => window.cancelAnimationFrame(frame);
  }, [kind, loading, numPages, page, renderPage]);

  // ── ResizeObserver: re-render al cambiar tamaño del contenedor ────────
  useEffect(() => {
    if (kind !== "pdf") return;
    const el = viewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (docRef.current) renderPageRef.current?.(page);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, page]);

  // ── UI ────────────────────────────────────────────────────────────────
  const missingSource = !displayUrl && !(file instanceof Blob);

  const rangeLabel = useMemo(() => {
    if (!numPages || numPages <= 1) return null;
    if (printMode === "page")  return `Solo pág. ${printPage}`;
    if (printMode === "range") return `Págs. ${effectiveFrom}–${effectiveTo}`;
    return null;
  }, [printMode, printPage, effectiveFrom, effectiveTo, numPages]);

  return (
    <div className={`w-full h-full ${className}`}>
      <div className="h-full w-full flex flex-col bg-white/95 rounded-b-2xl overflow-hidden">

        {/* Header */}
        <div className="px-3 pt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-slate-800 line-clamp-1">{fileName}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {ext ? ext.toUpperCase() : "ARCHIVO"}
              {missingSource ? " · (no se encontró el archivo real)" : ""}
            </div>
          </div>
          {displayUrl && (
            <a href={displayUrl} target="_blank" rel="noreferrer"
              className="shrink-0 px-2 py-1 text-[12px] rounded-md bg-slate-200 hover:bg-slate-300 text-slate-800">
              Abrir
            </a>
          )}
        </div>

        {/* Área de previsualización */}
        <div
          ref={kind === "pdf" ? viewRef : undefined}
          className="flex-1 mt-2 mx-2 mb-2 rounded-md bg-slate-100 border border-slate-200 overflow-hidden"
        >
          {missingSource ? (
            <div className="h-full grid place-items-center p-4 text-center">
              <p className="text-sm text-slate-700 font-medium">No se encontró el archivo para previsualizar</p>
              <p className="text-xs text-slate-600 mt-2">
                Esto pasa si recargaste la página. Vuelve a subir el archivo.
              </p>
            </div>
          ) : loading ? (
            <div className="h-full grid place-items-center text-sm text-slate-500">Cargando…</div>
          ) : err ? (
            <div className="h-full grid place-items-center p-4 text-center">
              <p className="text-sm text-red-600">No se pudo mostrar</p>
              <p className="text-xs text-slate-600 mt-2">{err}</p>
            </div>
          ) : kind === "pdf" ? (
            <div className="w-full h-full flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                className="block max-h-full max-w-full bg-white shadow rounded-sm"
              />
            </div>
          ) : kind === "image" ? (
            <div className="w-full h-full flex items-center justify-center p-2">
              <img key={displayUrl} src={displayUrl} alt={fileName}
                className="max-w-full max-h-full object-contain rounded-sm shadow bg-white"
                onError={() => setErr("No se pudo cargar la imagen.")} />
            </div>
          ) : kind === "allowed-no-preview" ? (
            <div className="h-full grid place-items-center p-4 text-center">
              <p className="text-sm text-slate-700 font-medium">
                Este formato se admite, pero no tiene vista previa aquí
              </p>
              <p className="text-xs text-slate-600 mt-2">
                Formatos como TIF/TIFF/HPGL2/DWF/PLT/GL2/PRN normalmente requieren conversión a PDF.
              </p>
              {displayUrl && (
                <a href={displayUrl} target="_blank" rel="noreferrer"
                  className="inline-block mt-3 px-3 py-2 text-sm rounded-md bg-slate-800 text-white hover:bg-slate-700">
                  Abrir archivo
                </a>
              )}
            </div>
          ) : (
            <div className="h-full grid place-items-center p-4 text-center">
              <p className="text-sm text-slate-700 font-medium">Vista previa no disponible</p>
              <p className="text-xs text-slate-600 mt-2">Usa "Abrir" para verlo/descargarlo.</p>
            </div>
          )}
        </div>

        {/* Controles de navegación PDF */}
        {kind === "pdf" && numPages > 1 && (
          <div className="px-3 pb-3 space-y-1.5">
            {rangeLabel && (
              <div className="flex justify-center">
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(99,102,241,0.15)", color: "#818CF8", border: "1px solid rgba(99,102,241,0.25)" }}>
                  Imprimiendo: {rangeLabel}
                  {selectedCount > 1 ? ` (${selectedCount} págs.)` : ""}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button type="button"
                className="px-2 py-1 text-xs rounded-md bg-slate-200 hover:bg-slate-300 text-slate-800 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(effectiveFrom, p - 1))}
                disabled={page <= effectiveFrom}>
                ‹
              </button>

              <div className="text-[12px] text-slate-700 text-center">
                <span>Página {page} de {numPages}</span>
                {printMode !== "all" && (
                  <span className="text-[10px] text-slate-400 block">
                    Navegando entre {effectiveFrom}–{effectiveTo}
                  </span>
                )}
              </div>

              <button type="button"
                className="px-2 py-1 text-xs rounded-md bg-slate-200 hover:bg-slate-300 text-slate-800 disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(effectiveTo, p + 1))}
                disabled={page >= effectiveTo}>
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
