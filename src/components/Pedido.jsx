// src/components/Pedido.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { pdfjsLib } from "@/lib/pdfjsSetup";

// === Constantes ===
const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.dwg";
const STORAGE_KEY = "cc2000_cart_v1";

// Papeles por modo/tecnología
const PAPERS = {
  bn: ["Bond 75 g", "Bond 90 g", "Acetato"],
  color_ink: ["Bond 75 g", "Bond 90 g", "Opalina 115 g"],
  color_laser: [
    "Bond 75 g",
    "Bond 90 g",
    "Opalina 115 g",
    "Opalina 225 g",
    "Couché 130 g",
    "Couché 300 g",
    "Kromacote 300 g",
    "Cartulina Sulfatada 300 g",
    "Adhesivo Mate",
    "Adhesivo Brillante",
    "Adhesivo Transparente",
    "Acetato",
  ],
};

// Precios (aprox. / placeholder, ajústalos a tu realidad)
const PRICE = {
  page: { bn: 0.5, color_ink: 3.0, color_laser: 5.0 },
  paperExtra: {
    "Opalina 115 g": 0.5,
    "Opalina 225 g": 1.3,
    "Couché 130 g": 0.6,
    "Couché 300 g": 1.5,
    "Kromacote 300 g": 1.8,
    "Cartulina Sulfatada 300 g": 1.6,
    "Adhesivo Mate": 2.0,
    "Adhesivo Brillante": 2.2,
    "Adhesivo Transparente": 2.5,
    Acetato: 1.8,
    "Bond 75 g": 0,
    "Bond 90 g": 0.15,
  },
  finishes: {
    engargolado: 20,
    laminado_una: 15,
    laminado_doble: 25,
    enmicado: 10,
  },
};

// === Config para COPIAS FÍSICAS (nuevo) ===
const COPIES_BASE_PRICE = {
  bn: 0.50, // ajusta a tus precios reales
  color: 3.50,
  mixto: 2.0,
};
const COPIES_FINISH_EXTRA = {
  ninguno: 0,
  engrapado: 0.20,
  perforado_folder: 1.0,
  engargolado: PRICE.finishes.engargolado, // usas el mismo que digital
};

// Utils
const uid = () => Math.random().toString(36).slice(2, 10);

// Rango "1-3,7,10-12"
function parseRange(spec, maxPage) {
  if (!spec || !/[\d,-]/.test(spec)) return [];
  const tokens = spec.split(",").map((t) => t.trim());
  const set = new Set();
  for (const t of tokens) {
    if (/^\d+$/.test(t)) set.add(Number(t));
    else if (/^\d+-\d+$/.test(t)) {
      const [a, b] = t.split("-").map(Number);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) set.add(i);
    }
  }
  return [...set].filter((n) => n >= 1 && n <= maxPage).sort((a, b) => a - b);
}

function allowedPaperList(colorMode, colorTech) {
  if (colorMode === "bn") return PAPERS.bn;
  if (colorTech === "ink") return PAPERS.color_ink;
  return PAPERS.color_laser;
}

function WhatsAppLinkText(cart) {
  const lines = cart.map((it, i) => {
    const s = it.settings;
    return [
      `#${i + 1} ${it.name}`,
      `- Tipo: ${it.kind.toUpperCase()}`,
      `- Color: ${
        s.colorMode === "bn"
          ? "B/N"
          : `Color (${s.colorTech === "ink" ? "Tinta" : "Láser"})`
      }`,
      `- Papel: ${s.paperName || "No seleccionado"}`,
      `- Copias: ${s.copies}`,
      `- Páginas: ${
        s.pageRange === "todo"
          ? "Todas"
          : s.pageRange === "actual"
          ? "Actual"
          : s.rangeSpec
      }`,
      `- Dúplex: ${s.duplex}`,
      `- Contenido: ${
        s.sizeMode === "ajustar"
          ? "Ajustar"
          : s.sizeMode === "real"
          ? "Tamaño real"
          : `Escala ${s.scalePct}%`
      }`,
      `- N-up: ${s.nup} por hoja (${s.nupOrientation})`,
      s.booklet
        ? "- Imposición folleto/revista: Sí"
        : "- Imposición folleto/revista: No",
      s.finishes?.engargolado?.enabled
        ? `- Engargolado: ${s.finishes.engargolado.type} (${s.finishes.engargolado.side})`
        : "",
      s.finishes?.laminado?.enabled
        ? `- Laminado: ${s.finishes.laminado.sides} cara(s), ${s.finishes.laminado.finish}`
        : "",
      s.finishes?.enmicado?.enabled
        ? `- Enmicado: ${s.finishes.enmicado.size}, ${s.finishes.enmicado.finish}`
        : "",
      `- Estimado: $${(it.estimate || 0).toFixed(2)} MXN`,
    ]
      .filter(Boolean)
      .join("\n");
  });

  const total = cart.reduce((a, b) => a + (b.estimate || 0), 0);
  return `*Pedido Copy Center 2000*\n\n${lines.join(
    "\n\n"
  )}\n\n*Total estimado:* $${total.toFixed(2)} MXN`;
}

// === Texto para WhatsApp SOLO copias físicas (nuevo) ===
function WhatsAppTextCopies(cfg, total) {
  const finishLabel =
    cfg.finish === "ninguno"
      ? "Sin acabado"
      : cfg.finish === "engrapado"
      ? "Solo engrapado"
      : cfg.finish === "perforado_folder"
      ? "Perforado + folder"
      : "Engargolado";

  const binding =
    cfg.finish === "engargolado"
      ? ` (${cfg.bindingType === "espiral" ? "Espiral plástico" : "Arillo metálico"})`
      : "";

  return [
    "*Pedido de Copias y Engargolados*",
    "",
    `- Tamaño: ${cfg.size}`,
    `- Tipo de copias: ${
      cfg.colorMode === "bn"
        ? "Blanco y negro"
        : cfg.colorMode === "color"
        ? "Color"
        : "Mixto"
    }`,
    `- Cantidad aproximada: ${cfg.quantity}`,
    `- Acabado: ${finishLabel}${binding}`,
    cfg.notes ? `- Notas: ${cfg.notes}` : "",
    "",
    `*Total estimado:* $${total.toFixed(2)} MXN`,
  ]
    .filter(Boolean)
    .join("\n");
}

// === Componente principal ===
export default function Pedido() {
  // modo de servicio: "digital" (archivos) o "copias" (sin archivo)
  const [serviceMode, setServiceMode] = useState("digital");

  // --- carrito de ARCHIVOS (igual que antes) ---
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [activeId, setActiveId] = useState(cart[0]?.id || null);

  // refs preview
  const canvasRef = useRef(null);
  const previewBoxRef = useRef(null);

  const [dragOver, setDragOver] = useState(false);

  // guardar settings/estimate en localStorage
  useEffect(() => {
    const toSave = cart.map(({ pdf, imageURL, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [cart]);

  const activeItem = useMemo(
    () => cart.find((c) => c.id === activeId) || null,
    [cart, activeId]
  );

  const total = useMemo(
    () => cart.reduce((a, b) => a + (b.estimate || 0), 0),
    [cart]
  );

  // === Estado para COPIAS FÍSICAS (nuevo) ===
  const [copiesConfig, setCopiesConfig] = useState({
    size: "Carta",
    colorMode: "bn", // bn | color | mixto
    quantity: 25,
    finish: "ninguno", // ninguno | engrapado | perforado_folder | engargolado
    bindingType: "espiral", // solo si finish === "engargolado"
    notes: "",
  });

  const copiesTotal = useMemo(() => {
    const base =
      COPIES_BASE_PRICE[copiesConfig.colorMode] || COPIES_BASE_PRICE.bn;
    const extra = COPIES_FINISH_EXTRA[copiesConfig.finish] || 0;
    const unit = base + extra;
    return unit * Math.max(1, Number(copiesConfig.quantity) || 1);
  }, [copiesConfig]);

  const whatsappHrefCopies = useMemo(() => {
    const text = encodeURIComponent(
      WhatsAppTextCopies(copiesConfig, copiesTotal)
    );
    return `https://wa.me/5217713531668?text=${text}`;
  }, [copiesConfig, copiesTotal]);

  // === Gestión de archivos (modo digital) ===
  function baseSettings() {
    return {
      colorMode: "bn",
      colorTech: "ink",
      paperName: "",
      copies: 1,
      pageRange: "todo",
      rangeSpec: "1-3",
      duplex: "Una cara",
      sizeMode: "ajustar",
      scalePct: 100,
      nup: 1,
      nupCustom: 2,
      nupOrientation: "Horizontal",
      booklet: false,
      finishes: {
        engargolado: {
          enabled: false,
          type: "Espiral",
          side: "Lado largo",
          color: "Negro",
        },
        laminado: {
          enabled: false,
          sides: 1,
          finish: "Brillante",
          size: "Carta",
        },
        enmicado: {
          enabled: false,
          size: "Credencial",
          finish: "Brillante",
        },
      },
    };
  }

  async function handleFiles(files) {
    const arr = Array.from(files || []);
    if (arr.length === 0) return;

    const adds = [];
    for (const f of arr) {
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      const id = uid();
      const item = {
        id,
        name: f.name,
        ext,
        size: f.size,
        kind: "other",
        currentPage: 1,
        pageCount: 1,
        settings: baseSettings(),
        estimate: 0,
      };

      if (["png", "jpg", "jpeg"].includes(ext)) {
        item.kind = "image";
        item.imageURL = URL.createObjectURL(f);
      } else if (ext === "pdf") {
        try {
          const buf = await f.arrayBuffer();
          const task = pdfjsLib.getDocument({ data: buf });
          const pdf = await task.promise;
          item.kind = "pdf";
          item.pdf = pdf;
          item.pageCount = pdf.numPages || 1;
          // Extraer dimensiones físicas de la primera página
          try {
            const firstPage = await pdf.getPage(1);
            const vp = firstPage.getViewport({ scale: 1 });
            const ptToCm = 2.54 / 72;
            item.pageWidthCm  = parseFloat((vp.width  * ptToCm).toFixed(2));
            item.pageHeightCm = parseFloat((vp.height * ptToCm).toFixed(2));
          } catch { /* sin dimensiones */ }
        } catch {
          item.kind = "other";
        }
      } else {
        item.kind = "other"; // doc/ppt/xls/dwg sin preview
      }
      adds.push(item);
    }

    setCart((prev) => {
      const next = [...prev, ...adds].map((it) => ({
        ...it,
        estimate: estimatePrice(it),
      }));
      if (!activeId && next[0]) setActiveId(next[0].id);
      return next;
    });
  }

  // Limpia URLs de imagen al quitar items o desmontar
  useEffect(() => {
    return () => {
      cart.forEach((it) => {
        if (it.imageURL) URL.revokeObjectURL(it.imageURL);
      });
    };
  }, [cart]);

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function removeItem(id) {
    const removed = cart.find((x) => x.id === id);
    if (removed?.imageURL) URL.revokeObjectURL(removed.imageURL);
    setCart((prev) => prev.filter((x) => x.id !== id));
    if (id === activeId) {
      const rest = cart.filter((x) => x.id !== id);
      setActiveId(rest[0]?.id || null);
    }
  }

  // === Estimador de precio ===
  function estimatePrice(item) {
    const s = item.settings;
    let pagesSelected = item.pageCount || 1;
    if (s.pageRange === "actual") pagesSelected = 1;
    if (s.pageRange === "rango") {
      const arr = parseRange(s.rangeSpec, item.pageCount || 1);
      pagesSelected = Math.max(arr.length, 0);
    }

    const nup = s.nup === 0 ? s.nupCustom : s.nup;
    const effectivePages = Math.ceil(pagesSelected / Math.max(1, nup));

    const key =
      s.colorMode === "bn"
        ? "bn"
        : s.colorTech === "ink"
        ? "color_ink"
        : "color_laser";
    const base = PRICE.page[key] || 0;
    const paperExtra = PRICE.paperExtra[s.paperName] || 0;

    let subtotal = effectivePages * (base + paperExtra);

    if (s.finishes?.engargolado?.enabled)
      subtotal += PRICE.finishes.engargolado;
    if (s.finishes?.laminado?.enabled)
      subtotal +=
        s.finishes.laminado.sides === 2
          ? PRICE.finishes.laminado_doble
          : PRICE.finishes.laminado_una;
    if (s.finishes?.enmicado?.enabled) subtotal += PRICE.finishes.enmicado;

    subtotal *= Math.max(1, s.copies || 1);
    return subtotal;
  }

  function updateSettings(patch) {
    if (!activeItem) return;
    setCart((prev) =>
      prev.map((it) =>
        it.id === activeItem.id
          ? { ...it, settings: { ...it.settings, ...patch } }
          : it
      )
    );
  }

  // Recalcular estimate cuando cambien settings
  useEffect(() => {
    setCart((prev) =>
      prev.map((it) => ({ ...it, estimate: estimatePrice(it) }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cart.map((x) => x.settings))]);

  // === PREVIEW ===
  useEffect(() => {
    const render = async () => {
      const it = activeItem;
      const canvas = canvasRef.current;
      const box = previewBoxRef.current;
      if (!it || !canvas || !box) return;

      const ctx = canvas.getContext("2d");
      const boxW = box.clientWidth || 900;
      const boxH = box.clientHeight || 600;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (it.kind === "image" && it.imageURL) {
        await new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => {
            const wr = boxW / img.width;
            const hr = boxH / img.height;
            const s =
              it.settings.sizeMode === "ajustar"
                ? Math.min(wr, hr)
                : it.settings.sizeMode === "real"
                ? 1
                : Math.max(0.1, Number(it.settings.scalePct) / 100);

            const w = Math.floor(img.width * s);
            const h = Math.floor(img.height * s);
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            res();
          };
          img.onerror = rej;
          img.src = it.imageURL;
        });
        return;
      }

      if (it.kind === "pdf" && it.pdf) {
        const pageNum = Math.min(
          Math.max(1, it.currentPage || 1),
          it.pageCount || 1
        );
        const pageObj = await it.pdf.getPage(pageNum);

        const base = pageObj.getViewport({ scale: 1, rotation: 0 });
        const isPortrait = base.height >= base.width;
        let rotation = 0; // opcional

        const rotated = pageObj.getViewport({ scale: 1, rotation });
        let targetScale = 1;
        if (it.settings.sizeMode === "ajustar") {
          const wr = boxW / rotated.width;
          const hr = boxH / rotated.height;
          targetScale = Math.min(wr, hr);
        } else if (it.settings.sizeMode === "real") {
          targetScale = 1;
        } else {
          targetScale = Math.max(
            0.1,
            Number(it.settings.scalePct) / 100
          );
        }

        const viewport = pageObj.getViewport({ scale: targetScale, rotation });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        await pageObj.render({
          canvasContext: ctx,
          viewport,
          intent: "display",
        }).promise;
        return;
      }

      // Otros tipos
      canvas.width = 800;
      canvas.height = 500;
      ctx.fillStyle = "#334155";
      ctx.font = "14px ui-sans-serif, system-ui, -apple-system";
      ctx.textAlign = "center";
      ctx.fillText(
        "Vista previa no disponible para este tipo de archivo.",
        canvas.width / 2,
        canvas.height / 2 - 8
      );
      ctx.fillText(
        "El archivo fue agregado correctamente al pedido.",
        canvas.width / 2,
        canvas.height / 2 + 16
      );
    };

    render();
  }, [activeItem, cart]);

  // Redibujar al redimensionar
  useEffect(() => {
    const handler = () => setCart((prev) => [...prev]);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // === UI helpers ===
  const paperOptions = useMemo(() => {
    const s = activeItem?.settings;
    if (!s) return [];
    return allowedPaperList(s.colorMode, s.colorTech);
  }, [activeItem]);

  const whatsappHref = useMemo(() => {
    const text = encodeURIComponent(WhatsAppLinkText(cart));
    return `https://wa.me/5217713531668?text=${text}`;
  }, [cart]);

  // === Render ===
  return (
    <section id="pedido" className="py-10">
      <div className="section">
        <h2 className="text-white text-2xl font-bold mb-4">
          Realiza tu pedido
        </h2>

        {/* Selector de modo de servicio */}
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            className={`chip ${
              serviceMode === "digital" ? "chip-active" : ""
            }`}
            onClick={() => setServiceMode("digital")}
          >
            Impresión de archivos (PDF, Word, etc.)
          </button>
          <button
            className={`chip ${
              serviceMode === "copias" ? "chip-active" : ""
            }`}
            onClick={() => setServiceMode("copias")}
          >
            Copias y Engargolados (solo originales físicos)
          </button>
        </div>

        {/* MODO ARCHIVOS (igual que antes) */}
        {serviceMode === "digital" && (
          <div className="grid lg:grid-cols-[360px_1fr] gap-6">
            {/* IZQUIERDA: Dropzone + Lista + Total */}
            <div className="space-y-4">
              {/* DROPZONE */}
              <div
                className={`dropzone ${
                  dragOver ? "dropzone-hover" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() =>
                  document
                    .getElementById("file-input-pedido")
                    .click()
                }
              >
                <p className="text-sm font-semibold text-slate-800">
                  Arrastra tus archivos o haz clic para seleccionar
                </p>
                <p className="kpi mt-1">
                  PDF, DOC(X), PPT(X), XLS(X), PNG, JPG, DWG
                </p>
                <input
                  id="file-input-pedido"
                  type="file"
                  accept={ACCEPT}
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* LISTA / CARRITO */}
              <div className="card p-3 space-y-2 max-h-[46vh] overflow-auto">
                {cart.length === 0 && (
                  <p className="kpi text-center py-6">
                    No hay archivos en el carrito.
                  </p>
                )}

                {cart.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => setActiveId(it.id)}
                    className={`item ${
                      it.id === activeId ? "item-active" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-left">
                        <div className="font-medium truncate">
                          {it.name}
                        </div>
                        <div className="kpi">
                          {it.kind.toUpperCase()} • {it.pageCount} pág • $
                          {(it.estimate || 0).toFixed(2)}
                        </div>
                      </div>
                      <button
                        className="icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(it.id);
                        }}
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  </button>
                ))}
              </div>

              {/* TOTAL + WHATSAPP */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="kpi">Total estimado</div>
                  <div className="text-lg font-bold text-slate-900">
                    ${total.toFixed(2)} MXN
                  </div>
                </div>
                <a
                  className="btn-primary w-full text-center"
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  Enviar pedido por WhatsApp
                </a>
              </div>
            </div>

            {/* DERECHA: Preview + Configuración */}
            <div className="space-y-4">
              {/* PREVIEW */}
              <div className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="kpi">
                    {activeItem
                      ? activeItem.kind === "pdf"
                        ? `Página ${activeItem.currentPage} de ${activeItem.pageCount}`
                        : activeItem.kind === "image"
                        ? "Vista previa de imagen"
                        : "Vista previa no disponible"
                      : "Sin selección"}
                  </div>
                  {activeItem?.kind === "pdf" && (
                    <div className="flex items-center gap-2">
                      <button
                        className="icon-btn"
                        onClick={() =>
                          setCart((prev) =>
                            prev.map((it) =>
                              it.id === activeItem.id
                                ? {
                                    ...it,
                                    currentPage: Math.max(
                                      1,
                                      (it.currentPage || 1) - 1
                                    ),
                                  }
                                : it
                            )
                          )
                        }
                        disabled={
                          !activeItem || activeItem.currentPage <= 1
                        }
                        title="Página anterior"
                      >
                        ◀
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() =>
                          setCart((prev) =>
                            prev.map((it) =>
                              it.id === activeItem.id
                                ? {
                                    ...it,
                                    currentPage: Math.min(
                                      it.pageCount || 1,
                                      (it.currentPage || 1) + 1
                                    ),
                                  }
                                : it
                            )
                          )
                        }
                        disabled={
                          !activeItem ||
                          (activeItem.currentPage || 1) >=
                            (activeItem.pageCount || 1)
                        }
                        title="Página siguiente"
                      >
                        ▶
                      </button>
                    </div>
                  )}
                </div>

                <div
                  ref={previewBoxRef}
                  className="relative w-full h-[64vh] bg-white/70 rounded-2xl grid place-items-center overflow-hidden"
                >
                  <canvas
                    ref={canvasRef}
                    className="shadow-lg rounded-lg max-w-full max-h-full"
                  />
                </div>
              </div>

              {/* CONFIGURACIÓN */}
              {activeItem && (
                <div className="card p-4 space-y-5">
                  <h4 className="text-[15px] font-semibold text-slate-900">
                    Configuración
                  </h4>

                  <div className="grid md:grid-cols-2 gap-3">
                    {/* Color */}
                    <div>
                      <label className="label">Modo de color</label>
                      <div className="chips">
                        <button
                          className={`chip ${
                            activeItem.settings.colorMode === "bn"
                              ? "chip-active"
                              : ""
                          }`}
                          onClick={() =>
                            updateSettings({ colorMode: "bn", paperName: "" })
                          }
                        >
                          B/N
                        </button>
                        <button
                          className={`chip ${
                            activeItem.settings.colorMode === "color"
                              ? "chip-active"
                              : ""
                          }`}
                          onClick={() =>
                            updateSettings({ colorMode: "color" })
                          }
                        >
                          Color
                        </button>
                      </div>
                    </div>

                    {/* Tecnología (si color) */}
                    {activeItem.settings.colorMode === "color" && (
                      <div>
                        <label className="label">Tecnología</label>
                        <select
                          className="select"
                          value={activeItem.settings.colorTech}
                          onChange={(e) =>
                            updateSettings({
                              colorTech: e.target.value,
                              paperName: "",
                            })
                          }
                        >
                          <option value="ink">
                            Inyección de tinta (económica)
                          </option>
                          <option value="laser">
                            Láser (más costosa)
                          </option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Papel */}
                  <div>
                    <label className="label">Tipo de papel</label>
                    <select
                      className="select"
                      value={activeItem.settings.paperName}
                      onChange={(e) =>
                        updateSettings({ paperName: e.target.value })
                      }
                    >
                      <option value="">Seleccionar…</option>
                      {paperOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Copias / Páginas / Dúplex */}
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="label">Número de copias</label>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={activeItem.settings.copies}
                        onChange={(e) =>
                          updateSettings({
                            copies: Math.max(
                              1,
                              Number(e.target.value) || 1
                            ),
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">Imprimir páginas</label>
                      <div className="chips">
                        <button
                          className={`chip ${
                            activeItem.settings.pageRange === "todo"
                              ? "chip-active"
                              : ""
                          }`}
                          onClick={() =>
                            updateSettings({ pageRange: "todo" })
                          }
                        >
                          Todo
                        </button>
                        <button
                          className={`chip ${
                            activeItem.settings.pageRange === "actual"
                              ? "chip-active"
                              : ""
                          }`}
                          onClick={() =>
                            updateSettings({ pageRange: "actual" })
                          }
                        >
                          Actual
                        </button>
                        <button
                          className={`chip ${
                            activeItem.settings.pageRange === "rango"
                              ? "chip-active"
                              : ""
                          }`}
                          onClick={() =>
                            updateSettings({ pageRange: "rango" })
                          }
                        >
                          Páginas
                        </button>
                      </div>
                      <input
                        className="input mt-2"
                        placeholder="1-3,7,10-12"
                        value={activeItem.settings.rangeSpec}
                        onChange={(e) =>
                          updateSettings({ rangeSpec: e.target.value })
                        }
                        disabled={
                          activeItem.settings.pageRange !== "rango"
                        }
                      />
                    </div>

                    <div>
                      <label className="label">Dúplex</label>
                      <select
                        className="select"
                        value={activeItem.settings.duplex}
                        onChange={(e) =>
                          updateSettings({ duplex: e.target.value })
                        }
                      >
                        <option>Una cara</option>
                        <option>Ambas (borde largo)</option>
                        <option>Ambas (borde corto)</option>
                      </select>
                    </div>
                  </div>

                  {/* Opciones avanzadas */}
                  <details className="card p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                      Opciones avanzadas
                    </summary>

                    <div className="mt-3 grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">
                          Tamaño del contenido
                        </label>
                        <div className="chips">
                          <button
                            className={`chip ${
                              activeItem.settings.sizeMode === "ajustar"
                                ? "chip-active"
                                : ""
                            }`}
                            onClick={() =>
                              updateSettings({ sizeMode: "ajustar" })
                            }
                          >
                            Ajustar
                          </button>
                          <button
                            className={`chip ${
                              activeItem.settings.sizeMode === "real"
                                ? "chip-active"
                                : ""
                            }`}
                            onClick={() =>
                              updateSettings({ sizeMode: "real" })
                            }
                          >
                            Tamaño real
                          </button>
                          <button
                            className={`chip ${
                              activeItem.settings.sizeMode === "escala"
                                ? "chip-active"
                                : ""
                            }`}
                            onClick={() =>
                              updateSettings({ sizeMode: "escala" })
                            }
                          >
                            Escala pers.
                          </button>
                        </div>
                        {activeItem.settings.sizeMode === "escala" && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              className="input"
                              type="number"
                              min={10}
                              max={400}
                              value={activeItem.settings.scalePct}
                              onChange={(e) =>
                                updateSettings({
                                  scalePct: Math.max(
                                    10,
                                    Math.min(
                                      400,
                                      Number(e.target.value) || 100
                                    )
                                  ),
                                })
                              }
                            />
                            <span className="kpi">% </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="label">Múltiple (N-up)</label>
                        <div className="chips">
                          {[1, 2, 4, 6].map((n) => (
                            <button
                              key={n}
                              className={`chip ${
                                activeItem.settings.nup === n &&
                                "chip-active"
                              }`}
                              onClick={() =>
                                updateSettings({ nup: n })
                              }
                            >
                              {n} / hoja
                            </button>
                          ))}
                          <button
                            className={`chip ${
                              activeItem.settings.nup === 0 &&
                              "chip-active"
                            }`}
                            onClick={() =>
                              updateSettings({ nup: 0 })
                            }
                          >
                            Pers.
                          </button>
                        </div>
                        {activeItem.settings.nup === 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              className="input"
                              type="number"
                              min={2}
                              max={16}
                              value={activeItem.settings.nupCustom}
                              onChange={(e) =>
                                updateSettings({
                                  nupCustom: Math.max(
                                    2,
                                    Math.min(
                                      16,
                                      Number(e.target.value) || 2
                                    )
                                  ),
                                })
                              }
                            />
                            <span className="kpi">pág/hoja</span>
                          </div>
                        )}

                        <label className="label mt-3">
                          Orientación del N-up
                        </label>
                        <select
                          className="select"
                          value={activeItem.settings.nupOrientation}
                          onChange={(e) =>
                            updateSettings({
                              nupOrientation: e.target.value,
                            })
                          }
                        >
                          <option>Horizontal</option>
                          <option>Vertical</option>
                        </select>
                      </div>
                    </div>

                    <div className="divider" />

                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeItem.settings.booklet}
                        onChange={(e) =>
                          updateSettings({
                            booklet: e.target.checked,
                          })
                        }
                      />
                      <span className="text-sm text-slate-700">
                        Imposición tipo folleto/revista (ordena para
                        doblar al centro)
                      </span>
                    </label>

                    <div className="divider" />

                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Engargolado */}
                      <div className="space-y-2">
                        <label className="label">Engargolado</label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={
                              activeItem.settings.finishes.engargolado
                                .enabled
                            }
                            onChange={(e) =>
                              updateSettings({
                                finishes: {
                                  ...activeItem.settings.finishes,
                                  engargolado: {
                                    ...activeItem.settings.finishes
                                      .engargolado,
                                    enabled: e.target.checked,
                                  },
                                },
                              })
                            }
                          />
                          Activar
                        </label>
                        {activeItem.settings.finishes.engargolado
                          .enabled && (
                          <>
                            <select
                              className="select"
                              value={
                                activeItem.settings.finishes
                                  .engargolado.type
                              }
                              onChange={(e) =>
                                updateSettings({
                                  finishes: {
                                    ...activeItem.settings.finishes,
                                    engargolado: {
                                      ...activeItem.settings
                                        .finishes.engargolado,
                                      type: e.target.value,
                                    },
                                  },
                                })
                              }
                            >
                              <option>Espiral</option>
                              <option>Wire-O</option>
                              <option>Térmico</option>
                            </select>
                            <select
                              className="select"
                              value={
                                activeItem.settings.finishes
                                  .engargolado.side
                              }
                              onChange={(e) =>
                                updateSettings({
                                  finishes: {
                                    ...activeItem.settings.finishes,
                                    engargolado: {
                                      ...activeItem.settings
                                        .finishes.engargolado,
                                      side: e.target.value,
                                    },
                                  },
                                })
                              }
                            >
                              <option>Lado largo</option>
                              <option>Lado corto</option>
                            </select>
                          </>
                        )}
                      </div>

                      {/* Laminado */}
                      <div className="space-y-2">
                        <label className="label">Laminado</label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={
                              activeItem.settings.finishes.laminado
                                .enabled
                            }
                            onChange={(e) =>
                              updateSettings({
                                finishes: {
                                  ...activeItem.settings.finishes,
                                  laminado: {
                                    ...activeItem.settings.finishes
                                      .laminado,
                                    enabled: e.target.checked,
                                  },
                                },
                              })
                            }
                          />
                          Activar
                        </label>
                        {activeItem.settings.finishes.laminado
                          .enabled && (
                          <>
                            <select
                              className="select"
                              value={
                                activeItem.settings.finishes.laminado
                                  .sides
                              }
                              onChange={(e) =>
                                updateSettings({
                                  finishes: {
                                    ...activeItem.settings.finishes,
                                    laminado: {
                                      ...activeItem.settings
                                        .finishes.laminado,
                                      sides: Number(e.target.value),
                                    },
                                  },
                                })
                              }
                            >
                              <option value={1}>Una cara</option>
                              <option value={2}>Doble cara</option>
                            </select>
                            <select
                              className="select"
                              value={
                                activeItem.settings.finishes.laminado
                                  .finish
                              }
                              onChange={(e) =>
                                updateSettings({
                                  finishes: {
                                    ...activeItem.settings.finishes,
                                    laminado: {
                                      ...activeItem.settings
                                        .finishes.laminado,
                                      finish: e.target.value,
                                    },
                                  },
                                })
                              }
                            >
                              <option>Brillante</option>
                              <option>Mate</option>
                            </select>
                          </>
                        )}
                      </div>

                      {/* Enmicado */}
                      <div className="space-y-2">
                        <label className="label">Enmicado</label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={
                              activeItem.settings.finishes.enmicado
                                .enabled
                            }
                            onChange={(e) =>
                              updateSettings({
                                finishes: {
                                  ...activeItem.settings.finishes,
                                  enmicado: {
                                    ...activeItem.settings.finishes
                                      .enmicado,
                                    enabled: e.target.checked,
                                  },
                                },
                              })
                            }
                          />
                          Activar
                        </label>
                        {activeItem.settings.finishes.enmicado
                          .enabled && (
                          <>
                            <select
                              className="select"
                              value={
                                activeItem.settings.finishes.enmicado
                                  .size
                              }
                              onChange={(e) =>
                                updateSettings({
                                  finishes: {
                                    ...activeItem.settings.finishes,
                                    enmicado: {
                                      ...activeItem.settings
                                        .finishes.enmicado,
                                      size: e.target.value,
                                    },
                                  },
                                })
                              }
                            >
                              <option>Credencial</option>
                              <option>1/4 carta</option>
                              <option>1/2 carta</option>
                              <option>Carta</option>
                              <option>Oficio</option>
                              <option>Tabloide</option>
                            </select>
                            <select
                              className="select"
                              value={
                                activeItem.settings.finishes.enmicado
                                  .finish
                              }
                              onChange={(e) =>
                                updateSettings({
                                  finishes: {
                                    ...activeItem.settings.finishes,
                                    enmicado: {
                                      ...activeItem.settings
                                        .finishes.enmicado,
                                      finish: e.target.value,
                                    },
                                  },
                                })
                              }
                            >
                              <option>Brillante</option>
                              <option>Mate</option>
                            </select>
                          </>
                        )}
                      </div>
                    </div>
                  </details>

                  {/* Estimado del activo */}
                  <div className="card p-4 flex items-center justify-between">
                    <div className="kpi">
                      Estimado:{" "}
                      <span className="font-semibold text-slate-900">
                        $
                        {cart
                          .find((x) => x.id === activeItem.id)
                          ?.estimate?.toFixed(2)}{" "}
                        MXN
                      </span>
                    </div>
                    <button
                      className="btn-outline"
                      onClick={() =>
                        setCart((prev) =>
                          prev.map((it) =>
                            it.id === activeItem.id
                              ? {
                                  ...it,
                                  estimate: estimatePrice(it),
                                }
                              : it
                          )
                        )
                      }
                    >
                      Recalcular
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODO COPIAS Y ENGARGOLADOS (sin archivo) */}
        {serviceMode === "copias" && (
          <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
            {/* Configuración de copias */}
            <div className="card p-4 space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Copias y Engargolados (sin archivo digital)
              </h3>
              <p className="text-sm text-slate-700 mb-3">
                Para este servicio trabajamos con tus{" "}
                <span className="font-semibold">originales físicos</span>.
                Solo indícanos los datos aproximados para poder darte una
                pre–cotización.
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                {/* Tamaño */}
                <div>
                  <label className="label">Tamaño de la copia</label>
                  <select
                    className="select"
                    value={copiesConfig.size}
                    onChange={(e) =>
                      setCopiesConfig((c) => ({
                        ...c,
                        size: e.target.value,
                      }))
                    }
                  >
                    <option value="Carta">Carta</option>
                    <option value="Oficio">Oficio</option>
                    <option value="Doble carta">
                      Doble carta / Tabloide
                    </option>
                  </select>
                </div>

                {/* Tipo de copias */}
                <div>
                  <label className="label">Tipo de copias</label>
                  <div className="chips">
                    <button
                      className={`chip ${
                        copiesConfig.colorMode === "bn"
                          ? "chip-active"
                          : ""
                      }`}
                      onClick={() =>
                        setCopiesConfig((c) => ({
                          ...c,
                          colorMode: "bn",
                        }))
                      }
                    >
                      Blanco y negro
                    </button>
                    <button
                      className={`chip ${
                        copiesConfig.colorMode === "color"
                          ? "chip-active"
                          : ""
                      }`}
                      onClick={() =>
                        setCopiesConfig((c) => ({
                          ...c,
                          colorMode: "color",
                        }))
                      }
                    >
                      Color
                    </button>
                    <button
                      className={`chip ${
                        copiesConfig.colorMode === "mixto"
                          ? "chip-active"
                          : ""
                      }`}
                      onClick={() =>
                        setCopiesConfig((c) => ({
                          ...c,
                          colorMode: "mixto",
                        }))
                      }
                    >
                      Mixto
                    </button>
                  </div>
                </div>
              </div>

              {/* Cantidad + acabado */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">
                    Cantidad de copias (aprox.)
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    value={copiesConfig.quantity}
                    onChange={(e) =>
                      setCopiesConfig((c) => ({
                        ...c,
                        quantity: Math.max(
                          1,
                          Number(e.target.value) || 1
                        ),
                      }))
                    }
                  />
                  <p className="kpi mt-1">
                    Puedes poner un número aproximado, el total se ajusta
                    al imprimir.
                  </p>
                </div>

                <div>
                  <label className="label">Tipo de acabado</label>
                  <div className="chips flex flex-wrap gap-2">
                    <button
                      className={`chip ${
                        copiesConfig.finish === "ninguno"
                          ? "chip-active"
                          : ""
                      }`}
                      onClick={() =>
                        setCopiesConfig((c) => ({
                          ...c,
                          finish: "ninguno",
                        }))
                      }
                    >
                      Sin acabado
                    </button>
                    <button
                      className={`chip ${
                        copiesConfig.finish === "engrapado"
                          ? "chip-active"
                          : ""
                      }`}
                      onClick={() =>
                        setCopiesConfig((c) => ({
                          ...c,
                          finish: "engrapado",
                        }))
                      }
                    >
                      Solo engrapado
                    </button>
                    <button
                      className={`chip ${
                        copiesConfig.finish === "perforado_folder"
                          ? "chip-active"
                          : ""
                      }`}
                      onClick={() =>
                        setCopiesConfig((c) => ({
                          ...c,
                          finish: "perforado_folder",
                        }))
                      }
                    >
                      Perforado + folder
                    </button>
                    <button
                      className={`chip ${
                        copiesConfig.finish === "engargolado"
                          ? "chip-active"
                          : ""
                      }`}
                      onClick={() =>
                        setCopiesConfig((c) => ({
                          ...c,
                          finish: "engargolado",
                        }))
                      }
                    >
                      Engargolado
                    </button>
                  </div>

                  {copiesConfig.finish === "engargolado" && (
                    <div className="mt-2">
                      <label className="label text-xs">
                        Tipo de engargolado
                      </label>
                      <select
                        className="select"
                        value={copiesConfig.bindingType}
                        onChange={(e) =>
                          setCopiesConfig((c) => ({
                            ...c,
                            bindingType: e.target.value,
                          }))
                        }
                      >
                        <option value="espiral">Espiral plástico</option>
                        <option value="metalico">Arillo metálico</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Mensaje */}
              <div>
                <label className="label">
                  Mensaje / indicaciones para estas copias
                </label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="Ej. separar por materias, numerar paquetes, engargolar solo las guías del maestro, etc."
                  value={copiesConfig.notes}
                  onChange={(e) =>
                    setCopiesConfig((c) => ({
                      ...c,
                      notes: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Resumen + WhatsApp */}
            <div className="space-y-4">
              <div className="card p-4 space-y-2">
                <h4 className="text-sm font-semibold text-slate-900">
                  Resumen del trabajo
                </h4>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>
                    <span className="font-semibold">Tamaño:</span>{" "}
                    {copiesConfig.size}
                  </li>
                  <li>
                    <span className="font-semibold">Tipo de copias:</span>{" "}
                    {copiesConfig.colorMode === "bn"
                      ? "Blanco y negro"
                      : copiesConfig.colorMode === "color"
                      ? "Color"
                      : "Mixto"}
                  </li>
                  <li>
                    <span className="font-semibold">
                      Cantidad aprox.:
                    </span>{" "}
                    {copiesConfig.quantity}
                  </li>
                  <li>
                    <span className="font-semibold">Acabado:</span>{" "}
                    {copiesConfig.finish === "ninguno"
                      ? "Sin acabado"
                      : copiesConfig.finish === "engrapado"
                      ? "Solo engrapado"
                      : copiesConfig.finish === "perforado_folder"
                      ? "Perforado + folder"
                      : `Engargolado (${
                          copiesConfig.bindingType === "espiral"
                            ? "Espiral plástico"
                            : "Arillo metálico"
                        })`}
                  </li>
                  {copiesConfig.notes && (
                    <li>
                      <span className="font-semibold">Notas:</span>{" "}
                      {copiesConfig.notes}
                    </li>
                  )}
                </ul>
              </div>

              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="kpi">Total estimado</div>
                  <div className="text-lg font-bold text-slate-900">
                    ${copiesTotal.toFixed(2)} MXN
                  </div>
                </div>
                <a
                  className="btn-primary w-full text-center"
                  href={whatsappHrefCopies}
                  target="_blank"
                  rel="noreferrer"
                >
                  Enviar datos de copias por WhatsApp
                </a>
                <p className="text-xs text-slate-500">
                  Este total es una pre–cotización. El importe final se
                  confirma al revisar tus originales en el mostrador.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
