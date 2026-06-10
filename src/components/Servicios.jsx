// src/components/Servicios.jsx
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CheckCircle2, Paperclip, PencilLine, Search, ShoppingCart, Upload, X } from "lucide-react";
import { useCart } from "./CartContext";
import { pdfjsLib } from "@/lib/pdfjsSetup";
import { supabase } from "@/lib/supabaseClient";
import ServiceOptionsEditor from "./service-editors/ServiceOptionsEditor";
import { getItemPrice, fmtMXN } from "../utils/getItemPrice";

gsap.registerPlugin(useGSAP, ScrollTrigger);

import digi from "@/assets/digi.png";
import engar from "@/assets/engar.png";
import planos from "@/assets/planos.png";
import artes from "@/assets/artes.png";
import stickers from "@/assets/stickers.png";
import pvcImg from "@/assets/pvc.png";
import subliImg from "@/assets/sublimacion.png";
import scanImg from "@/assets/scan.png";
import pinsImg from "@/assets/pins.png";

// Mapa de imágenes locales por serviceKey
const IMG_MAP = {
  impresion:   digi,
  copias:      engar,
  ploteo:      planos,
  artes:       artes,
  stickers:    stickers,
  pvc:         pvcImg,
  sublimacion: subliImg,
  fotobotones: pinsImg,
  escaneo:     scanImg,
};

// Fallback estático (por si la BD tarda o falla)
const SERVICIOS_FALLBACK = [
  { id: "impresion",   nombre: "Impresión Digital",         tag: "FULL COLOR / B/N", descripcion: "Desde 1 pieza sin mínimo. Color y B/N en bond, couché, opalina y más. Ideal para cortas tiradas o archivos con datos variables.",        desde_precio: "Desde $1.20/pieza", activo: true, orden: 1, requiere_archivo: true  },
  { id: "copias",      nombre: "Copias y Engargolados",     tag: "OFICINA",          descripcion: "Copias rápidas y nítidas, engargolados y presentaciones.",                                                                                          desde_precio: "Desde $0.90/copia", activo: true, orden: 2, requiere_archivo: false },
  { id: "ploteo",      nombre: "Impresiones gran formato",  tag: "GRAN FORMATO",     descripcion: "Ploteo en Bond, Opalina, Fotográfico, Canvas, Lona y Vinil. Precio por metro lineal.",                                                              desde_precio: "Cotización por m²", activo: true, orden: 3, requiere_archivo: true  },
  { id: "artes",       nombre: "Impresos Comerciales",      tag: "OFFSET · MILLAR",  descripcion: "Offset por millar (mín. 1,000 pzas) del mismo diseño. Couché 115g/150g/300g, bond y adhesivo. Mejor costo en grandes tiradas.",                   desde_precio: "Desde $315/millar", activo: true, orden: 4, requiere_archivo: false },
  { id: "stickers",    nombre: "Stickers",                  tag: "VINIL",            descripcion: "Stickers redondos, cuadrados o de contorno. Vinil mate/brillante.",                    desde_precio: "Cotización",        activo: true, orden: 5, requiere_archivo: true  },
  { id: "pvc",         nombre: "Tarjetas PVC",              tag: "CREDENCIALES",     descripcion: "Tarjetas plásticas, credenciales, códigos QR, folios y más.",                         desde_precio: "Desde $18/tarjeta", activo: true, orden: 6, requiere_archivo: true  },
  { id: "sublimacion", nombre: "Sublimación",               tag: "PERSONALIZADOS",   descripcion: "Tazas, termos, playeras, cojines y más con tu diseño.",                               desde_precio: "Desde $30/pieza",   activo: true, orden: 7, requiere_archivo: true  },
  { id: "fotobotones", nombre: "Fotobotones y Pines",       tag: "PROMOCIONALES",    descripcion: "Pines y fotobotones personalizados con tu foto o logo.",                              desde_precio: "Desde $9/pieza",    activo: true, orden: 8, requiere_archivo: true  },
  { id: "escaneo",     nombre: "Escaneos y Digitalización", tag: "DIGITAL",          descripcion: "Escaneo de documentos y planos, PDF/JPG y envío por correo.",                         desde_precio: "Desde $0.40/hoja",  activo: true, orden: 9, requiere_archivo: false },
];

// Badge de cantidad mínima por servicio (se muestra en la tarjeta)
const QTY_BADGE = {
  impresion: { label: "DESDE 1 PIEZA",    bg: "rgba(16,185,129,0.12)", color: "#34D399", border: "rgba(16,185,129,0.25)" },
  artes:     { label: "MÍN. 1,000 PZS",   bg: "rgba(234,179,8,0.10)", color: "#FDE047", border: "rgba(234,179,8,0.28)"  },
};

// ✅ Aceptados (sin Office)
const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.tif,.tiff,.dwf,.plt,.gl2,.prn,.hpgl2";

// ❌ Office bloqueado
const OFFICE_EXTS = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];

function extFromName(name = "") {
  const s = String(name);
  const i = s.lastIndexOf(".");
  return i >= 0 ? s.slice(i + 1).toLowerCase() : "";
}


// Servicios que van directo a configurar opciones (sin pedir archivo primero)
const CONFIGURAR_PRIMERO = ["stickers"];

const STICKER_DEFAULTS = {
  stkSizePreset: "10x10",
  stkWidthCm: 10,
  stkHeightCm: 10,
  stkQtyPreset: "100",
  stkMaterial: "vinil-mate",
  stkCutType: "hoja",
  stkLaminado: false,
};

export default function Servicios({ onAddedToCart, onDirectCheckout, onEditItem }) {
  const [seleccion, setSeleccion] = useState(null);
  const [paso, setPaso] = useState("pregunta");
  const [localMsg, setLocalMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [servicios, setServicios] = useState(SERVICIOS_FALLBACK);
  const [tempOptions, setTempOptions] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightKey, setHighlightKey] = useState(null);
  const [processingFiles, setProcessingFiles] = useState({
    active: false,
    current: 0,
    total: 0,
    name: "",
  });
  const fileInputRef = useRef(null);
  const gridRef = useRef(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const dialogTriggerRef = useRef(null);
  const shouldRestoreDialogFocusRef = useRef(true);
  const processingFilesRef = useRef(false);
  const cardRefs = useRef({});
  const searchTimerRef = useRef(null);
  processingFilesRef.current = processingFiles.active;

  const { addItem } = useCart();

  // ── Buscador ────────────────────────────────────────────────────────────────
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    clearTimeout(searchTimerRef.current);

    if (!query.trim()) {
      setHighlightKey(null);
      return;
    }

    searchTimerRef.current = setTimeout(() => {
      const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normalize = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const match = servicios.find((s) => {
        const nombre = normalize(s.nombre || s.titulo);
        const desc   = normalize(s.descripcion || s.desc);
        const tag    = normalize(s.tag);
        return nombre.includes(q) || desc.includes(q) || tag.includes(q);
      });

      if (match) {
        const key = match.id || match.serviceKey;
        setHighlightKey(key);
        const el = cardRefs.current[key];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // Animación: glow pulsante + pequeño rebote
          gsap.killTweensOf(el);
          gsap.timeline()
            .to(el, { scale: 1.03, duration: 0.18, ease: "power2.out" })
            .to(el, { scale: 1.0,  duration: 0.22, ease: "power2.in" })
            .fromTo(el,
              { boxShadow: "0 0 0 3px rgba(79,123,218,0.95), 0 0 28px rgba(79,123,218,0.6)" },
              { boxShadow: "0 0 0 3px rgba(79,123,218,0.2), 0 0 8px rgba(79,123,218,0.1)",
                duration: 0.7, repeat: 3, yoyo: true, ease: "sine.inOut" },
              "<0.1"
            )
            .to(el, { boxShadow: "0 0 0 2px rgba(79,123,218,0.55)", duration: 0.3 });
        }
      } else {
        setHighlightKey(null);
      }
    }, 280);
  }, [servicios]);

  // Limpiar highlight al borrar el query
  useEffect(() => {
    if (!searchQuery) {
      setHighlightKey(null);
      // limpiar boxShadow de todas las cards
      Object.values(cardRefs.current).forEach((el) => {
        if (el) gsap.to(el, { boxShadow: "none", duration: 0.3 });
      });
    }
  }, [searchQuery]);

  useGSAP(() => {
    const cards = gridRef.current?.querySelectorAll(".servicio-card");
    if (!cards?.length) return;

    gsap.fromTo(
      cards,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        duration: 0.55,
        ease: "power3.out",
        clearProps: "transform",
        scrollTrigger: {
          trigger: gridRef.current,
          start: "top 85%",
          once: true,
        },
      }
    );
  }, { scope: gridRef });

  // Cargar servicios desde la BD
  useEffect(() => {
    supabase
      .from("servicios")
      .select("*")
      .order("orden")
      .then(({ data }) => {
        if (data && data.length > 0) setServicios(data);
      });
  }, []);

  // Opciones por defecto para servicios sin archivo
  const SINARCHIVO_OPTIONS = {
    copias: {
      copySize: "Carta",
      copyColorMode: "bn",
      copyQtyApprox: 1,
      copyFinish: "ninguno",
      copyBindingType: undefined,
      copiesNotes: "",
    },
    escaneo: {
      scanColorMode: "bn",
      scanSize: "Carta",
      scanDuplex: "simple",
      scanDpi: "300",
      scanOutput: "pdf-unico",
      scanQtyApprox: 1,
      scanNotes: "",
    },
  };

  // Servicios sin archivo son los que tienen requiere_archivo = false
  const SIN_ARCHIVO_KEYS = servicios
    .filter((s) => !s.requiere_archivo)
    .map((s) => s.id || s.serviceKey);

  const handleCardClick = (servicio, triggerElement) => {
    if (!servicio.activo) return;
    dialogTriggerRef.current = triggerElement || document.activeElement;
    shouldRestoreDialogFocusRef.current = true;
    setLocalMsg("");

    // 🔵 Sin archivo: copias, escaneos
    if (SIN_ARCHIVO_KEYS.includes(servicio.serviceKey)) {
      setSeleccion(servicio);
      setPaso("sinarchivo");
      return;
    }

    // 🟠 Configurar primero (stickers): opciones + precio antes del archivo
    if (CONFIGURAR_PRIMERO.includes(servicio.serviceKey)) {
      setSeleccion(servicio);
      setTempOptions(servicio.serviceKey === "stickers" ? { ...STICKER_DEFAULTS } : {});
      setPaso("configurar");
      return;
    }

    // 🔹 Resto: pregunta de diseño + subir archivo
    setSeleccion(servicio);
    setPaso("pregunta");
  };

  // Agrega al carrito con las opciones configuradas (sin archivo por ahora)
  const handleAgregarConfigurado = () => {
    if (!seleccion) return;
    addItem({
      serviceKey:   seleccion.serviceKey,
      serviceLabel: seleccion.titulo,
      quantity:     1,
      options:      tempOptions,
    });
    handleCloseModal({ restoreFocus: false });
    onAddedToCart?.();
  };

  // Agrega al carrito y luego va a subir archivo
  const handleAgregarYSubir = () => {
    if (!seleccion) return;
    addItem({
      serviceKey:   seleccion.serviceKey,
      serviceLabel: seleccion.titulo,
      quantity:     1,
      options:      tempOptions,
    });
    setPaso("subir");
  };

  const handleAgregarSinArchivo = () => {
    if (!seleccion) return;
    addItem({
      serviceKey: seleccion.serviceKey,
      serviceLabel: seleccion.titulo,
      quantity: 1,
      options: SINARCHIVO_OPTIONS[seleccion.serviceKey] ?? {},
    });
    handleCloseModal({ restoreFocus: false });
    onAddedToCart?.();
  };

  const handleConfirmarSinArchivo = () => {
    if (!seleccion) return;
    addItem({
      serviceKey: seleccion.serviceKey,
      serviceLabel: seleccion.titulo,
      quantity: 1,
      options: SINARCHIVO_OPTIONS[seleccion.serviceKey] ?? {},
    });
    handleCloseModal({ restoreFocus: false });
    onDirectCheckout?.();
  };

  const handleCloseModal = ({ restoreFocus = true } = {}) => {
    if (processingFilesRef.current) return;
    shouldRestoreDialogFocusRef.current = restoreFocus;
    setSeleccion(null);
    setPaso("pregunta");
    setLocalMsg("");
    setIsDragging(false);
    setTempOptions({});
    setProcessingFiles({ active: false, current: 0, total: 0, name: "" });
  };

  useEffect(() => {
    if (!seleccion) return undefined;

    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleDialogKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!processingFilesRef.current) handleCloseModal();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(
        (element) =>
          !element.hasAttribute("hidden") && element.getClientRects().length > 0
      );

      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleDialogKeyDown);
      document.body.style.overflow = previousOverflow;
      if (shouldRestoreDialogFocusRef.current) {
        window.setTimeout(() => dialogTriggerRef.current?.focus(), 0);
      }
    };
  }, [seleccion]);

  // Precio en tiempo real para el paso "configurar"
  const precioTemp = useMemo(() => {
    if (!seleccion) return null;
    return getItemPrice({ serviceKey: seleccion.serviceKey, options: tempOptions });
  }, [seleccion, tempOptions]);

  const handleIrASubirArchivos = () => {
    setPaso("subir");
  };

  const handleNecesitoDiseno = () => {
    if (!seleccion) return;
    const mensaje = encodeURIComponent(
      `Hola, me interesa el servicio de "${seleccion.titulo}" y necesito ayuda con el diseño.`
    );
    window.open(`https://wa.me/527713531668?text=${mensaje}`, "_blank");
    handleCloseModal();
  };

  const processFiles = async (files) => {
    const incomingFiles = Array.from(files || []).filter(Boolean);
    if (!incomingFiles.length || !seleccion || processingFiles.active) return;
    setLocalMsg("");
    setProcessingFiles({
      active: true,
      current: 0,
      total: incomingFiles.length,
      name: "",
    });
    let addedCount = 0;
    // Si viene del paso "configurar→subir", el ítem ya fue agregado al carrito
    // Solo queremos agregar archivos adicionales como ítems nuevos (flujo normal)
    // El ítem sin archivo ya quedó en el carrito con las opciones configuradas

    try {
      for (let index = 0; index < incomingFiles.length; index += 1) {
      const file = incomingFiles[index];
      setProcessingFiles({
        active: true,
        current: index + 1,
        total: incomingFiles.length,
        name: file.name,
      });
      const ext = extFromName(file.name);

      // ❌ Bloquear Office
      if (OFFICE_EXTS.includes(ext)) {
        setLocalMsg(
          "ESTÁS INTENTANDO SUBIR UN ARCHIVO DE LA PAQUETERÍA DE OFFICE, MEJOR FAVOR DE CONVERTIR A PDF PARA UNA MEJOR GESTIÓN."
        );
        continue;
      }

      const blobUrl = URL.createObjectURL(file);

      // Extraer pageCount para PDFs
      let pageCount = 1;
      let pageWidthCm = null;
      let pageHeightCm = null;
      if (ext === "pdf") {
        try {
          const buf = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
          pageCount = pdf.numPages || 1;
          try {
            const firstPage = await pdf.getPage(1);
            const vp = firstPage.getViewport({ scale: 1 });
            const ptToCm = 2.54 / 72;
            pageWidthCm  = parseFloat((vp.width  * ptToCm).toFixed(2));
            pageHeightCm = parseFloat((vp.height * ptToCm).toFixed(2));
          } catch { /* sin dimensiones */ }
        } catch { /* no se pudo leer */ }
      }

      const isPinsService       = seleccion.serviceKey === "fotobotones";
      const isPloteoService     = seleccion.serviceKey === "ploteo";
      const isSublimacionService = seleccion.serviceKey === "sublimacion";
      const isPvcService         = seleccion.serviceKey === "pvc";

      const defaultOptions = isPinsService
        ? {
            pinSizeCm: "5.8",
            pinFinish: "mate",
            pinQty: 1,
            pinType: "pin",
            pinOther: "",
            pinNotes: "",
          }
        : isPloteoService
        ? {
            plotUnit: "cm",
            plotSubstrate: "Bond",
            plotMode: "color",
            plotSaturation: "0-10",
            plotFotoFinish: "Brillante",
            plotQuantity: 1,
            plotWidth: "",
            plotHeight: "",
          }
        : isSublimacionService
        ? {
            subProductType: "taza-blanca",
            subBaseColor: "blanco",
            subPrintArea: "frente",
            gamesQty: 1,
            subNotes: "",
          }
        : isPvcService
        ? {
            pvcVariant: "normal",
            pvcSides: "frente",
            gamesQty: 1,
            pvcNotes: "",
          }
        : {};

      addItem({
        serviceKey: seleccion.serviceKey,
        serviceLabel: seleccion.titulo,
        fileName: file.name,
        fileType: file.type,
        ext,
        previewUrl: blobUrl,
        file,
        quantity: 1,
        pageCount,
        ...(pageWidthCm  != null && { pageWidthCm }),
        ...(pageHeightCm != null && { pageHeightCm }),
        options: defaultOptions,
      });
      addedCount += 1;
    }

    if (addedCount > 0) {
      shouldRestoreDialogFocusRef.current = false;
      onAddedToCart?.();
      setSeleccion(null);
      setPaso("pregunta");
      setLocalMsg("");
      setIsDragging(false);
      setTempOptions({});
      }
    } catch (error) {
      console.error("[Servicios] Error al procesar archivos:", error);
      setLocalMsg("No se pudo procesar el archivo. Intenta de nuevo o conviertelo a PDF.");
    } finally {
      setProcessingFiles({ active: false, current: 0, total: 0, name: "" });
    }
  };

  const handleFilesChange = (e) => {
    processFiles(Array.from(e.target.files || []));
    try { e.target.value = ""; } catch {}
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files || []));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const activeCount = servicios.filter((s) => s.activo !== false).length;

  return (
    <section className="space-y-5">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <h2 className="text-2xl font-semibold text-white">Servicios</h2>
        <p className="text-sm leading-6 text-muted-foreground md:max-w-xl md:text-right">
          Sube tus archivos por servicio, configura cómo lo quieres y agrégalo al carrito.
        </p>
        <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-secondary-foreground md:justify-self-end">
          {activeCount} servicios activos
        </div>
      </div>

      {/* ── Buscador de servicios ── */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Busca un servicio, por ejemplo: volantes, tarjetas, planos"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") handleSearch(""); }}
            className="w-full rounded-lg py-2.5 pl-10 pr-10 text-sm outline-none transition-all"
            style={{
              backgroundColor: '#111827',
              border: searchQuery
                ? '1px solid rgba(79,123,218,0.6)'
                : '1px solid #273449',
              color: '#F5F7FA',
              boxShadow: searchQuery ? '0 0 0 3px rgba(79,123,218,0.12)' : 'none',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              className="absolute right-2.5 grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-white"
              aria-label="Limpiar busqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Indicador de resultado */}
        {searchQuery && (
          <p className="mt-1.5 text-[11px] pl-1" style={{ color: highlightKey ? '#34D399' : '#F87171' }}>
            {highlightKey
              ? `Encontrado: ${servicios.find(s => (s.id || s.serviceKey) === highlightKey)?.nombre || highlightKey}`
              : "No se encontró ningún servicio con ese término"}
          </p>
        )}
      </div>

      <div ref={gridRef} className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
        {servicios.map((s) => {
          const key = s.id || s.serviceKey;
          const img = IMG_MAP[key];
          const nombre = s.nombre || s.titulo;
          const desc = s.descripcion || s.desc;
          const fromPrice = s.desde_precio || s.fromPrice;
          const activo = s.activo !== false;

          const isHighlighted = highlightKey === key;
          return (
            <button
              key={key}
              ref={(el) => { cardRefs.current[key] = el; }}
              type="button"
              onClick={(event) =>
                handleCardClick(
                  { ...s, serviceKey: key, titulo: nombre, desc },
                  event.currentTarget
                )
              }
              disabled={!activo}
              className={`servicio-card group relative flex h-full flex-col overflow-hidden rounded-lg text-left shadow-sm transition-colors
                         focus:outline-none focus:ring-2 focus:ring-ring
                         ${activo ? "hover:border-primary hover:shadow-lg" : "cursor-not-allowed opacity-60"}`}
              style={{
                backgroundColor: '#111827',
                border: isHighlighted ? '1px solid rgba(79,123,218,0.7)' : '1px solid #273449',
              }}
              onMouseEnter={(e) => { if (activo) e.currentTarget.style.borderColor = '#1F4AA8'; }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isHighlighted ? 'rgba(79,123,218,0.7)' : '#273449';
              }}
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-ring to-[#4E7BDA]" />

              {/* Badge suspendido */}
              {!activo && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/50 backdrop-blur-[2px]">
                  <span className="rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                    style={{ background: 'rgba(198,28,28,0.85)', color: '#fff', border: '1px solid rgba(255,100,100,0.4)' }}>
                    {s.suspendido_msg || "Temporalmente no disponible"}
                  </span>
                </div>
              )}

              {img && (
                <img
                  src={img}
                  alt={nombre}
                  className="h-40 w-full object-cover"
                  loading="lazy"
                />
              )}

              <div className="flex flex-1 flex-col p-4 pb-5">
                {s.tag && (
                  <span className="mb-2 inline-flex items-center self-start rounded-md px-3 py-0.5 text-[11px] uppercase tracking-[0.18em]" style={{ background: 'rgba(27,36,51,0.8)', color: '#9AA6B2', border: '1px solid #273449' }}>
                    {s.tag}
                  </span>
                )}

                <h3 className="font-semibold text-base" style={{ color: '#F5F7FA' }}>{nombre}</h3>
                <p className="mt-1 text-sm flex-1" style={{ color: '#9AA6B2' }}>{desc}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {fromPrice && (
                    <span className="inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' }}>
                      {fromPrice}
                    </span>
                  )}
                  {QTY_BADGE[key] && (
                    <span className="inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                      style={{ backgroundColor: QTY_BADGE[key].bg, color: QTY_BADGE[key].color, border: `1px solid ${QTY_BADGE[key].border}` }}>
                      {QTY_BADGE[key].label}
                    </span>
                  )}
                  {s.cadBadge && (
                    <span className="inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: 'rgba(234,179,8,0.1)', color: '#FDE047', border: '1px solid rgba(234,179,8,0.25)' }}>
                      🎉 Desc. por volumen
                    </span>
                  )}
                </div>

                <span
                  className="mt-auto inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all"
                  style={{ border: '1px solid #273449', color: '#E5ECF6', backgroundColor: 'rgba(27,36,51,0.5)' }}
                >
                  {activo ? "Elegir servicio" : "No disponible"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* MODAL */}
      {seleccion && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-dialog-title"
            aria-describedby="service-dialog-description"
            tabIndex={-1}
            className="relative max-h-[88vh] w-[90%] max-w-lg overflow-y-auto rounded-lg p-5 shadow-2xl md:w-[480px] md:p-6"
            style={{ backgroundColor: '#111827', border: '1px solid #273449' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="service-dialog-title" className="sr-only">
              Configurar {seleccion.titulo}
            </h2>
            <p id="service-dialog-description" className="sr-only">
              Selecciona las opciones del servicio y agrega tu pedido al carrito.
            </p>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleCloseModal}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-sm transition"
              style={{ background: 'rgba(27,36,51,0.8)', color: '#9AA6B2' }}
              aria-label={`Cerrar configuración de ${seleccion.titulo}`}
            >
              ✕
            </button>

            {paso === "pregunta" && (
              <>
                <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: '#9AA6B2' }}>
                  SERVICIO SELECCIONADO
                </p>
                <h3 className="text-lg md:text-xl font-semibold" style={{ color: '#F5F7FA' }}>
                  {seleccion.titulo}
                </h3>
                <p className="text-sm mt-1" style={{ color: '#9AA6B2' }}>{seleccion.desc}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {seleccion.tag && (
                    <span className="rounded-md px-3 py-1 text-[11px] uppercase tracking-[0.17em]"
                      style={{ background: 'rgba(27,36,51,0.8)', color: '#9AA6B2', border: '1px solid #273449' }}>
                      {seleccion.tag}
                    </span>
                  )}
                  <span className="rounded-md px-3 py-1 text-[11px] uppercase tracking-[0.17em]"
                    style={{ background: 'rgba(27,36,51,0.8)', color: '#9AA6B2', border: '1px solid #273449' }}>
                    Copy Center 2000
                  </span>
                </div>

                <div className="mt-5">
                  <p className="text-sm mb-3" style={{ color: '#E5ECF6' }}>
                    ¿Tu diseño ya está listo o necesitas apoyo para desarrollarlo?
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={handleIrASubirArchivos}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold shadow-sm transition"
                      style={{ backgroundColor: '#1F4AA8', color: '#FFFFFF' }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Sí, ya tengo mi archivo listo
                    </button>

                    <button
                      type="button"
                      onClick={handleNecesitoDiseno}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-sm transition"
                      style={{ border: '1px solid #273449', color: '#E5ECF6', backgroundColor: 'rgba(27,36,51,0.6)' }}
                    >
                      <PencilLine className="h-4 w-4" />
                      No, necesito que me ayuden con el diseño
                    </button>
                  </div>
                  {processingFiles.active && (
                    <div className="mt-3 rounded-lg border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
                      Leyendo el archivo para calcular paginas y medidas. Esto puede tardar si el PDF es pesado.
                    </div>
                  )}
                </div>
              </>
            )}

            {paso === "configurar" && (
              <>
                <p className="text-xs uppercase tracking-[0.18em] mb-1" style={{ color: '#9AA6B2' }}>
                  {seleccion.tag || "SERVICIO"}
                </p>
                <h3 className="text-lg font-semibold mb-1" style={{ color: '#F5F7FA' }}>
                  {seleccion.titulo}
                </h3>

                {/* Editor de opciones con scroll */}
                <div className="overflow-y-auto pr-1 mt-3" style={{ maxHeight: '55vh' }}>
                  <ServiceOptionsEditor
                    item={{ serviceKey: seleccion.serviceKey, options: tempOptions, quantity: 1 }}
                    onChangeOptions={(patch) => setTempOptions((prev) => ({ ...prev, ...patch }))}
                  />
                </div>

                {/* Precio en tiempo real */}
                <div className="mt-4 flex items-center justify-between gap-3 rounded-lg px-4 py-3"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  {precioTemp ? (
                    <>
                      <div>
                        <p className="text-[11px]" style={{ color: '#6EE7B7' }}>Por unidad</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: '#F5F7FA' }}>
                          ${fmtMXN(precioTemp.perUnit)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px]" style={{ color: '#6EE7B7' }}>Total estimado</p>
                        <p className="text-xl font-bold tabular-nums" style={{ color: '#34D399' }}>
                          ${fmtMXN(precioTemp.total)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-[12px] w-full text-center" style={{ color: '#9AA6B2' }}>
                      Completa tamaño y cantidad para ver el precio
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="mt-4 flex flex-col gap-2">
                  <button type="button" onClick={handleAgregarConfigurado}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold shadow-sm transition"
                    style={{ backgroundColor: '#1F4AA8', color: '#fff' }}>
                    <ShoppingCart className="h-4 w-4" />
                    Agregar al carrito
                  </button>
                  <button type="button" onClick={handleAgregarYSubir}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition"
                    style={{ border: '1px solid #273449', color: '#E5ECF6', backgroundColor: 'rgba(27,36,51,0.6)' }}>
                    <Paperclip className="h-4 w-4" />
                    Agregar y subir mi archivo de diseño
                  </button>
                  <button type="button" onClick={handleNecesitoDiseno}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition"
                    style={{ border: '1px solid #273449', color: '#9AA6B2', backgroundColor: 'transparent' }}>
                    <PencilLine className="h-4 w-4" />
                    Necesito ayuda con el diseño
                  </button>
                </div>
              </>
            )}

            {paso === "subir" && (
              <>
                <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: '#9AA6B2' }}>
                  SUBE TUS ARCHIVOS
                </p>
                <h3 className="text-lg md:text-xl font-semibold" style={{ color: '#F5F7FA' }}>
                  Archivos para {seleccion.titulo}
                </h3>
                <p className="text-sm mt-1" style={{ color: '#9AA6B2' }}>
                  Adjunta tus archivos. Cada archivo se agregará como un elemento
                  independiente en tu carrito.
                </p>

                {localMsg && (
                  <div className="mt-3 rounded-lg px-3 py-2 text-[12px]"
                    style={{ border: '1px solid rgba(198,28,28,0.4)', background: 'rgba(198,28,28,0.1)', color: '#F5A0A0' }}>
                    {localMsg}
                  </div>
                )}

                <div className="mt-4">
                  <div
                    className={`mt-1 flex flex-col items-center gap-3 rounded-lg p-6 transition-all ${processingFiles.active ? "cursor-wait opacity-80" : "cursor-pointer"}`}
                    style={{
                      border: isDragging ? '2px dashed #1F4AA8' : '2px dashed #273449',
                      backgroundColor: isDragging ? 'rgba(31,74,168,0.12)' : 'rgba(22,32,48,0.6)',
                      boxShadow: isDragging ? '0 0 0 3px rgba(31,74,168,0.2)' : 'none',
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={processingFiles.active ? undefined : handleDrop}
                    onClick={() => {
                      if (!processingFiles.active) fileInputRef.current?.click();
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPT}
                      onChange={handleFilesChange}
                      disabled={processingFiles.active}
                      className="hidden"
                    />
                    <Upload className="h-10 w-10" style={{ color: isDragging ? '#4E7BDA' : '#4B5563' }} />
                    <div className="text-center">
                      <p className="text-sm font-medium" style={{ color: isDragging ? '#93C5FD' : '#E5ECF6' }}>
                        {processingFiles.active
                          ? `Procesando ${processingFiles.current || 1} de ${processingFiles.total || 1}`
                          : isDragging ? 'Suelta aquí tus archivos' : 'Arrastra tus archivos aquí'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#9AA6B2' }}>
                        {processingFiles.active
                          ? processingFiles.name || "Leyendo archivo..."
                          : "o haz clic para seleccionar"}
                      </p>
                    </div>
                    <p className="text-[11px] text-center" style={{ color: '#6B7280' }}>
                      PDF, PNG/JPG/TIFF, DWF, PLT/GL2/PRN/HPGL2 — Office no permitido
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={processingFiles.active}
                    className="w-full rounded-lg px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ border: '1px solid #273449', color: '#E5ECF6', backgroundColor: 'rgba(27,36,51,0.6)' }}
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}

            {paso === "sinarchivo" && (
              <>
                <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: '#9AA6B2' }}>
                  SERVICIO SELECCIONADO
                </p>
                <h3 className="text-lg md:text-xl font-semibold" style={{ color: '#F5F7FA' }}>
                  {seleccion.titulo}
                </h3>
                <p className="text-sm mt-1" style={{ color: '#9AA6B2' }}>
                  {seleccion.desc}
                </p>

                <p className="text-sm mt-4" style={{ color: '#E5ECF6' }}>
                  Este servicio trabaja con tus <strong>originales físicos</strong>. Agrégalo al carrito y ajusta las opciones antes de confirmar.
                </p>

                <div className="mt-5 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleAgregarSinArchivo}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold shadow-sm transition"
                    style={{ backgroundColor: '#1F4AA8', color: '#FFFFFF' }}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Agregar al carrito
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmarSinArchivo}
                    className="w-full rounded-lg px-4 py-3 text-sm font-semibold shadow-sm transition"
                    style={{ backgroundColor: '#C61C1C', color: '#FFFFFF' }}
                  >
                    Confirmar pedido →
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full rounded-lg px-4 py-3 text-sm font-medium transition"
                    style={{ border: '1px solid #273449', color: '#9AA6B2', backgroundColor: 'transparent' }}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </section>
  );
}
