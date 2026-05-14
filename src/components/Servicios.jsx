// src/components/Servicios.jsx
import { useRef, useState, useEffect } from "react";
import { useCart } from "./CartContext";
import { pdfjsLib } from "@/lib/pdfjsSetup";
import { supabase } from "@/lib/supabaseClient";

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
  { id: "impresion",   nombre: "Impresión Digital",         tag: "FULL COLOR / B/N", descripcion: "Color y B/N, flyers, tarjetas, calcomanías, posters.",                                 desde_precio: "Desde $1.20/hoja",  activo: true, orden: 1, requiere_archivo: true  },
  { id: "copias",      nombre: "Copias y Engargolados",     tag: "OFICINA",          descripcion: "Copias rápidas y nítidas, engargolados y presentaciones.",                              desde_precio: "Desde $0.90/copia", activo: true, orden: 2, requiere_archivo: false },
  { id: "ploteo",      nombre: "Impresiones gran formato",  tag: "GRAN FORMATO",     descripcion: "Ploteo en Bond, Opalina, Fotográfico, Canvas, Lona y Vinil. Precio por metro lineal.", desde_precio: "Cotización por m²", activo: true, orden: 3, requiere_archivo: true  },
  { id: "artes",       nombre: "Artes Gráficas",            tag: "DISEÑO",           descripcion: "Diseño de tarjetas, volantes, menús, lonas y artes finales para impresión.",           desde_precio: "Cotización",        activo: true, orden: 4, requiere_archivo: false },
  { id: "stickers",    nombre: "Stickers",                  tag: "VINIL",            descripcion: "Stickers redondos, cuadrados o de contorno. Vinil mate/brillante.",                    desde_precio: "Cotización",        activo: true, orden: 5, requiere_archivo: true  },
  { id: "pvc",         nombre: "Tarjetas PVC",              tag: "CREDENCIALES",     descripcion: "Tarjetas plásticas, credenciales, códigos QR, folios y más.",                         desde_precio: "Desde $18/tarjeta", activo: true, orden: 6, requiere_archivo: true  },
  { id: "sublimacion", nombre: "Sublimación",               tag: "PERSONALIZADOS",   descripcion: "Tazas, termos, playeras, cojines y más con tu diseño.",                               desde_precio: "Desde $30/pieza",   activo: true, orden: 7, requiere_archivo: true  },
  { id: "fotobotones", nombre: "Fotobotones y Pines",       tag: "PROMOCIONALES",    descripcion: "Pines y fotobotones personalizados con tu foto o logo.",                              desde_precio: "Desde $9/pieza",    activo: true, orden: 8, requiere_archivo: true  },
  { id: "escaneo",     nombre: "Escaneos y Digitalización", tag: "DIGITAL",          descripcion: "Escaneo de documentos y planos, PDF/JPG y envío por correo.",                         desde_precio: "Desde $0.40/hoja",  activo: true, orden: 9, requiere_archivo: false },
];

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


export default function Servicios({ onAddedToCart, onDirectCheckout, onEditItem }) {
  const [seleccion, setSeleccion] = useState(null);
  const [paso, setPaso] = useState("pregunta");
  const [localMsg, setLocalMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [servicios, setServicios] = useState(SERVICIOS_FALLBACK);
  const fileInputRef = useRef(null);

  const { addItem } = useCart();

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

  const handleCardClick = (servicio) => {
    if (!servicio.activo) return; // No abrir modal si está suspendido
    setLocalMsg("");

    // 🔵 Copias y Escaneos: modal sin archivo con botones Agregar/Confirmar
    if (SIN_ARCHIVO_KEYS.includes(servicio.serviceKey)) {
      setSeleccion(servicio);
      setPaso("sinarchivo");
      return;
    }

    // 🔹 Resto: modal con pregunta de diseño + subir archivo
    setSeleccion(servicio);
    setPaso("pregunta");
  };

  const handleAgregarSinArchivo = () => {
    if (!seleccion) return;
    addItem({
      serviceKey: seleccion.serviceKey,
      serviceLabel: seleccion.titulo,
      quantity: 1,
      options: SINARCHIVO_OPTIONS[seleccion.serviceKey] ?? {},
    });
    handleCloseModal();
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
    handleCloseModal();
    onDirectCheckout?.();
  };

  const handleCloseModal = () => {
    setSeleccion(null);
    setPaso("pregunta");
    setLocalMsg("");
    setIsDragging(false);
  };

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
    if (!files.length || !seleccion) return;
    setLocalMsg("");

    for (const file of files) {
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
    }

    onAddedToCart?.();
    handleCloseModal();
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

  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold" style={{ color: '#F5F7FA' }}>Servicios</h2>
        <p className="hidden sm:block text-sm max-w-md" style={{ color: '#9AA6B2' }}>
          Sube tus archivos por servicio, configura cómo lo quieres y agrégalo al carrito.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {servicios.map((s) => {
          const key = s.id || s.serviceKey;
          const img = IMG_MAP[key];
          const nombre = s.nombre || s.titulo;
          const desc = s.descripcion || s.desc;
          const fromPrice = s.desde_precio || s.fromPrice;
          const activo = s.activo !== false;

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleCardClick({ ...s, serviceKey: key, titulo: nombre, desc })}
              disabled={!activo}
              className={`text-left group relative overflow-hidden rounded-3xl shadow-lg transition-all
                         focus:outline-none focus:ring-2 focus:ring-ring
                         ${activo ? "hover:-translate-y-1 hover:shadow-2xl" : "opacity-60 cursor-not-allowed"}`}
              style={{ backgroundColor: '#111827', border: '1px solid #273449' }}
              onMouseEnter={(e) => { if (activo) e.currentTarget.style.borderColor = '#1F4AA8'; }}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#273449'}
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-ring to-[#4E7BDA]" />

              {/* Badge suspendido */}
              {!activo && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-black/50 backdrop-blur-[2px]">
                  <span className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider"
                    style={{ background: 'rgba(198,28,28,0.85)', color: '#fff', border: '1px solid rgba(255,100,100,0.4)' }}>
                    {s.suspendido_msg || "Temporalmente no disponible"}
                  </span>
                </div>
              )}

              {img && (
                <img
                  src={img}
                  alt={nombre}
                  className="w-full h-40 object-cover rounded-t-3xl"
                  loading="lazy"
                />
              )}

              <div className="p-4 pb-5 flex flex-col h-full">
                {s.tag && (
                  <span className="inline-flex items-center self-start rounded-full px-3 py-0.5 text-[11px] uppercase tracking-[0.18em] mb-2" style={{ background: 'rgba(27,36,51,0.8)', color: '#9AA6B2', border: '1px solid #273449' }}>
                    {s.tag}
                  </span>
                )}

                <h3 className="font-semibold text-base" style={{ color: '#F5F7FA' }}>{nombre}</h3>
                <p className="mt-1 text-sm flex-1" style={{ color: '#9AA6B2' }}>{desc}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {fromPrice && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' }}>
                      {fromPrice}
                    </span>
                  )}
                  {s.cadBadge && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: 'rgba(234,179,8,0.1)', color: '#FDE047', border: '1px solid rgba(234,179,8,0.25)' }}>
                      🎉 Desc. por volumen
                    </span>
                  )}
                </div>

                <span
                  className="mt-3 inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium transition-all"
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
            className="relative max-w-lg w-[90%] md:w-[480px] rounded-3xl shadow-2xl p-5 md:p-6"
            style={{ backgroundColor: '#111827', border: '1px solid #273449' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute right-3 top-3 h-8 w-8 rounded-full flex items-center justify-center text-sm transition"
              style={{ background: 'rgba(27,36,51,0.8)', color: '#9AA6B2' }}
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
                    <span className="px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.17em]"
                      style={{ background: 'rgba(27,36,51,0.8)', color: '#9AA6B2', border: '1px solid #273449' }}>
                      {seleccion.tag}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.17em]"
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
                      className="w-full rounded-2xl px-4 py-3 text-sm font-semibold transition shadow-md"
                      style={{ backgroundColor: '#1F4AA8', color: '#FFFFFF' }}
                    >
                      ✅ Sí, ya tengo mi archivo listo
                    </button>

                    <button
                      type="button"
                      onClick={handleNecesitoDiseno}
                      className="w-full rounded-2xl px-4 py-3 text-sm font-medium transition shadow-md"
                      style={{ border: '1px solid #273449', color: '#E5ECF6', backgroundColor: 'rgba(27,36,51,0.6)' }}
                    >
                      ✏️ No, necesito que me ayuden con el diseño
                    </button>
                  </div>
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
                  <div className="mt-3 rounded-2xl px-3 py-2 text-[12px]"
                    style={{ border: '1px solid rgba(198,28,28,0.4)', background: 'rgba(198,28,28,0.1)', color: '#F5A0A0' }}>
                    {localMsg}
                  </div>
                )}

                <div className="mt-4">
                  <div
                    className="mt-1 rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-all"
                    style={{
                      border: isDragging ? '2px dashed #1F4AA8' : '2px dashed #273449',
                      backgroundColor: isDragging ? 'rgba(31,74,168,0.12)' : 'rgba(22,32,48,0.6)',
                      boxShadow: isDragging ? '0 0 0 3px rgba(31,74,168,0.2)' : 'none',
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPT}
                      onChange={handleFilesChange}
                      className="hidden"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none"
                      stroke={isDragging ? '#4E7BDA' : '#4B5563'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <div className="text-center">
                      <p className="text-sm font-medium" style={{ color: isDragging ? '#93C5FD' : '#E5ECF6' }}>
                        {isDragging ? 'Suelta aquí tus archivos' : 'Arrastra tus archivos aquí'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#9AA6B2' }}>
                        o haz clic para seleccionar
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
                    className="w-full rounded-2xl px-4 py-3 text-sm font-medium transition"
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
                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold transition shadow-md"
                    style={{ backgroundColor: '#1F4AA8', color: '#FFFFFF' }}
                  >
                    🛒 Agregar al carrito
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmarSinArchivo}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold transition shadow-md"
                    style={{ backgroundColor: '#C61C1C', color: '#FFFFFF' }}
                  >
                    Confirmar pedido →
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-medium transition"
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
