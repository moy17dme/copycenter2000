// src/components/PinCircularPreview.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { pdfjsLib } from "@/lib/pdfjsSetup";

const CIRCLE_PX = 210; // diámetro CSS del círculo

// ── helpers ────────────────────────────────────────────────────────────────
function getKind(item) {
  const ext = (
    item?.ext ||
    (item?.fileName ?? "").split(".").pop() ||
    ""
  ).toLowerCase();
  const mime = item?.mime || item?.fileType || item?.file?.type || "";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (
    ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tif", "tiff"].includes(ext) ||
    mime.startsWith("image/")
  )
    return "image";
  return "unknown";
}

function pickSrc(item, kind) {
  const blob = item?.file || item?.pdfFile || item?.fileObject || item?.blob;
  if (kind === "image") {
    const url = item?.previewUrl || item?.fileUrl || item?.url || item?.src || "";
    if (url) return { url, revoke: false };
    if (blob instanceof Blob) return { url: URL.createObjectURL(blob), revoke: true };
  }
  if (kind === "pdf") {
    const url = item?.fileUrl || item?.pdfUrl || item?.url || "";
    if (url) return { url, revoke: false };
    if (blob instanceof Blob) return { url: URL.createObjectURL(blob), revoke: true };
  }
  return null;
}

// ── component ──────────────────────────────────────────────────────────────
export default function PinCircularPreview({ item, opts = {}, onChangeOptions }) {
  const canvasRef  = useRef(null);
  const sourceRef  = useRef(null);

  const [status,    setStatus]    = useState("idle");
  const [errMsg,    setErrMsg]    = useState("");
  const [sliderVal, setSliderVal] = useState(
    () => Math.round((opts.pinCropScale ?? 1) * 100)
  );
  const [grabbing,  setGrabbing]  = useState(false);

  // Crop en refs → redibuja sin ciclo de React (drag fluido)
  const cropRef = useRef({
    x:     Number(opts.pinCropX     ?? 0),
    y:     Number(opts.pinCropY     ?? 0),
    scale: Number(opts.pinCropScale ?? 1),
  });

  const dragging = useRef(false);
  const lastPtr  = useRef({ x: 0, y: 0 });

  // ── carga ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!item) return;

    cropRef.current = {
      x:     Number(opts.pinCropX     ?? 0),
      y:     Number(opts.pinCropY     ?? 0),
      scale: Number(opts.pinCropScale ?? 1),
    };
    setSliderVal(Math.round(cropRef.current.scale * 100));
    setStatus("loading");
    setErrMsg("");
    sourceRef.current = null;

    const kind    = getKind(item);
    const srcInfo = pickSrc(item, kind);

    if (!srcInfo) {
      setStatus("error");
      setErrMsg("No hay imagen disponible para este ítem.");
      return;
    }

    let cancelled = false;
    const { url, revoke } = srcInfo;

    if (kind === "image") {
      const img       = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        sourceRef.current = img;
        setStatus("ready");
      };
      img.onerror = () => {
        if (!cancelled) { setStatus("error"); setErrMsg("No se pudo cargar la imagen."); }
      };
      img.src = url;
    } else if (kind === "pdf") {
      (async () => {
        let doc = null;
        try {
          doc = await pdfjsLib.getDocument(url).promise;
          if (cancelled) return;
          const pg       = await doc.getPage(1);
          const viewport = pg.getViewport({ scale: 2 });
          const off      = document.createElement("canvas");
          off.width      = Math.floor(viewport.width);
          off.height     = Math.floor(viewport.height);
          const ctx      = off.getContext("2d");
          ctx.fillStyle  = "#fff";
          ctx.fillRect(0, 0, off.width, off.height);
          await pg.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          sourceRef.current = off;
          setStatus("ready");
        } catch (e) {
          if (!cancelled) { setStatus("error"); setErrMsg(e?.message || "Error al renderizar PDF."); }
        } finally {
          try { await doc?.destroy(); } catch {}
        }
      })();
    } else {
      setStatus("error");
      setErrMsg("Formato no compatible con vista previa circular.");
    }

    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  // ── dibujar ────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const src    = sourceRef.current;
    if (!canvas || !src) return;

    const size = CIRCLE_PX;
    const dpr  = window.devicePixelRatio || 1;

    // Resetear dimensiones limpia el contexto y evita artefactos
    canvas.width        = size * dpr;
    canvas.height       = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    const { x, y, scale } = cropRef.current;
    const w = src.width  ?? src.naturalWidth  ?? size;
    const h = src.height ?? src.naturalHeight ?? size;
    const base = Math.max(size / w, size / h);
    const s    = base * scale;
    const dw   = w * s;
    const dh   = h * s;
    const dx   = (size - dw) / 2 + x;
    const dy   = (size - dh) / 2 + y;

    ctx.drawImage(src, dx, dy, dw, dh);
  }, []);

  useEffect(() => {
    if (status === "ready") draw();
  }, [status, draw]);

  // ── drag ──────────────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    lastPtr.current  = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setGrabbing(true);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPtr.current.x;
    const dy = e.clientY - lastPtr.current.y;
    lastPtr.current    = { x: e.clientX, y: e.clientY };
    cropRef.current.x += dx;
    cropRef.current.y += dy;
    draw();
    onChangeOptions?.({ pinCropX: cropRef.current.x, pinCropY: cropRef.current.y });
  }, [draw, onChangeOptions]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
    setGrabbing(false);
  }, []);

  // ── zoom ──────────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta    = e.deltaY < 0 ? 0.07 : -0.07;
    const newScale = Math.max(0.5, Math.min(5, cropRef.current.scale + delta));
    cropRef.current.scale = newScale;
    draw();
    setSliderVal(Math.round(newScale * 100));
    onChangeOptions?.({ pinCropScale: newScale });
  }, [draw, onChangeOptions]);

  // ── reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    cropRef.current = { x: 0, y: 0, scale: 1 };
    draw();
    setSliderVal(100);
    onChangeOptions?.({ pinCropX: 0, pinCropY: 0, pinCropScale: 1 });
  }, [draw, onChangeOptions]);

  // ── render ────────────────────────────────────────────────────────────────
  // El círculo se logra con overflow:hidden + borderRadius en el wrapper div.
  // El canvas es rectangular pero queda oculto fuera del círculo por CSS.
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-3 select-none"
      style={{ paddingBlock: 8 }}
    >
      {/* ── Círculo principal ── */}
      <div
        style={{
          position:     "relative",
          width:        CIRCLE_PX,
          height:       CIRCLE_PX,
          borderRadius: "50%",
          overflow:     "hidden",        // ← esto recorta el canvas en círculo
          cursor:       grabbing ? "grabbing" : (status === "ready" ? "grab" : "default"),
          touchAction:  "none",
          flexShrink:   0,
          // Borde y sombra exterior del fotobotón
          boxShadow:    "0 0 0 4px rgba(255,255,255,0.18), 0 12px 36px rgba(0,0,0,0.7)",
          border:       "3px solid rgba(255,255,255,0.28)",
          backgroundColor: "#111827",
        }}
        onPointerDown={status === "ready" ? handlePointerDown : undefined}
        onPointerMove={status === "ready" ? handlePointerMove : undefined}
        onPointerUp={status === "ready" ? handlePointerUp   : undefined}
        onPointerCancel={status === "ready" ? handlePointerUp : undefined}
        onWheel={status === "ready" ? handleWheel : undefined}
      >
        {/* Loading */}
        {status === "loading" && (
          <div
            className="animate-pulse"
            style={{
              width: "100%", height: "100%",
              display: "grid", placeItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "#6B7280" }}>Cargando…</span>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div
            style={{
              width: "100%", height: "100%",
              display: "grid", placeItems: "center",
              padding: 16, textAlign: "center",
            }}
          >
            <span style={{ fontSize: 11, color: "#F87171" }}>{errMsg}</span>
          </div>
        )}

        {/* Idle */}
        {status === "idle" && (
          <div
            style={{
              width: "100%", height: "100%",
              display: "grid", placeItems: "center",
            }}
          >
            <span style={{ fontSize: 11, color: "#374151" }}>Sin imagen</span>
          </div>
        )}

        {/* Canvas — solo visible cuando ready */}
        {status === "ready" && (
          <canvas
            ref={canvasRef}
            style={{ display: "block" }}
          />
        )}
      </div>

      {/* ── Controles (solo cuando hay imagen) ── */}
      {status === "ready" && (
        <>
          <div
            className="flex items-center gap-2"
            style={{ width: CIRCLE_PX }}
          >
            <span style={{ fontSize: 13, color: "#6B7280", userSelect: "none" }}>−</span>
            <input
              type="range"
              min={50}
              max={400}
              step={5}
              value={sliderVal}
              onChange={(e) => {
                const v = Number(e.target.value);
                cropRef.current.scale = v / 100;
                draw();
                setSliderVal(v);
                onChangeOptions?.({ pinCropScale: v / 100 });
              }}
              className="flex-1 accent-orange-400"
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, color: "#6B7280", userSelect: "none" }}>+</span>
            <button
              type="button"
              onClick={handleReset}
              title="Restablecer posición y zoom"
              style={{
                fontSize: 15,
                lineHeight: 1,
                padding: "3px 8px",
                borderRadius: 8,
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "#9AA6B2",
                border: "1px solid rgba(255,255,255,0.12)",
                cursor: "pointer",
              }}
            >
              ↺
            </button>
          </div>

          <p style={{ fontSize: 10, color: "#4B5563", textAlign: "center", lineHeight: 1.5 }}>
            Arrastra para posicionar · Rueda o slider para zoom
          </p>
        </>
      )}
    </div>
  );
}
