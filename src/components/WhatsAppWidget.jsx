// src/components/WhatsAppWidget.jsx
import { useEffect, useMemo, useState } from "react";
import waIcon from "@/assets/whatsapp.png";

// ── Logo WhatsApp como imagen ────────────────────────────────────────────────
const WaLogo = ({ size = 24 }) => (
  <img src={waIcon} alt="WhatsApp" width={size} height={size} style={{ objectFit: "contain" }} />
);

// Hora actual formateada
function nowTime() {
  return new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export default function WhatsAppWidget({
  phone    = "527713531668",
  brand    = "Copy Center 2000",
  position = "right",
}) {
  const [open,    setOpen]    = useState(false);
  const [name,    setName]    = useState("");
  const [service, setService] = useState("Impresión digital");
  const [message, setMessage] = useState("");
  const [time]                = useState(nowTime);

  // Cierra con ESC
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const quick = useMemo(() => [
    { label: "📄 Impresión",  fill: "Quiero cotizar impresión. ¿Qué datos necesitas?" },
    { label: "🧷 Stickers",   fill: "Quiero cotizar stickers (medidas, material y cantidad)." },
    { label: "📐 Planos",     fill: "Quiero cotizar ploteo de planos. ¿Aceptan PDF/PLT?" },
    { label: "🪪 PVC",        fill: "Quiero cotizar credenciales PVC. ¿Qué opciones manejan?" },
    { label: "📌 Pines",      fill: "Quiero cotizar pines/fotobotones. Tamaños y acabados, por favor." },
  ], []);

  const finalText = useMemo(() => {
    const parts = [`Hola, ${brand}.`];
    if (name.trim())    parts.push(`Mi nombre es ${name.trim()}.`);
    if (service)        parts.push(`Servicio: ${service}.`);
    if (message.trim()) parts.push(`Consulta: ${message.trim()}`);
    parts.push("¿Me puedes asesorar por favor?");
    return parts.join("\n");
  }, [brand, name, service, message]);

  const waUrl = useMemo(
    () => `https://wa.me/${phone}?text=${encodeURIComponent(finalText)}`,
    [phone, finalText]
  );

  const side = position === "left" ? "left-4" : "right-4";

  return (
    <>
      {/* ── FAB ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir chat de WhatsApp"
        className={`fixed bottom-5 ${side} z-[1000] group`}
      >
          <span
          className="relative flex items-center gap-2 rounded-full px-4 py-3 shadow-2xl font-semibold text-sm
                     transition-transform duration-200 group-hover:scale-105"
          style={{ backgroundColor: "#25D366", color: "#fff" }}
        >
          <WaLogo size={22} />
          <span className="hidden sm:inline tracking-wide">WhatsApp</span>
        </span>
      </button>

      {/* ── Panel tipo chat de WhatsApp ───────────────────────── */}
      {open && (
        <div
          className={`fixed bottom-20 ${side} z-[1000] w-[320px] sm:w-[360px] rounded-2xl overflow-hidden shadow-2xl`}
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          role="dialog"
          aria-modal="true"
        >

          {/* ── Header ── */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ backgroundColor: "#202C33" }}
          >
            {/* Avatar */}
            <div
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
              style={{ backgroundColor: "#25D366" }}
            >
              <WaLogo size={22} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "#E9EDE9" }}>
                {brand}
              </p>
              <p className="text-[11px] flex items-center gap-1" style={{ color: "#8696A0" }}>
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: "#25D366" }}
                />
                En línea
              </p>
            </div>

            {/* Cerrar */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-shrink-0 w-8 h-8 grid place-items-center rounded-full text-sm transition hover:opacity-70"
              style={{ color: "#8696A0" }}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* ── Área de chat ── */}
          <div
            className="px-3 py-4 space-y-3 overflow-y-auto"
            style={{
              backgroundColor: "#0B141A",
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.015'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
              minHeight: "260px",
              maxHeight: "55vh",
            }}
          >
            {/* Burbuja del negocio (recibido) */}
            <div className="flex items-end gap-2 max-w-[88%]">
              {/* Mini-avatar */}
              <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mb-1"
                style={{ backgroundColor: "#25D366" }}
              >
                <WaLogo size={13} />
              </div>

              <div
                className="rounded-2xl rounded-bl-none px-3 py-2.5 shadow-md relative"
                style={{ backgroundColor: "#202C33" }}
              >
                {/* Pico de burbuja */}
                <span
                  className="absolute -left-[6px] bottom-0 w-0 h-0"
                  style={{
                    borderTop: "8px solid transparent",
                    borderRight: "8px solid #202C33",
                  }}
                />
                <p className="text-[13px] leading-snug" style={{ color: "#E9EDE9" }}>
                  ¡Hola! 👋 Soy el asistente de <strong>{brand}</strong>.
                  ¿En qué te podemos ayudar hoy?
                </p>
                <p className="text-[10px] mt-1 text-right" style={{ color: "#8696A0" }}>
                  {time} ✓✓
                </p>
              </div>
            </div>

            {/* Respuestas rápidas */}
            <div className="flex flex-wrap gap-1.5 pl-8">
              {quick.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setMessage(q.fill)}
                  className="text-[11px] px-3 py-1.5 rounded-full border transition hover:opacity-80"
                  style={{
                    backgroundColor: "rgba(37,211,102,0.12)",
                    borderColor: "rgba(37,211,102,0.35)",
                    color: "#25D366",
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Separador "Tu mensaje" */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
              <span className="text-[10px] uppercase tracking-widest" style={{ color: "#4A5568" }}>
                Completa tu consulta
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Formulario integrado en el chat */}
            <div
              className="rounded-2xl rounded-tl-none ml-8 p-3 space-y-2.5 shadow-md"
              style={{ backgroundColor: "#005C4B" }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-xl px-3 py-2 text-[13px] outline-none"
                style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#E9EDE9" }}
              />

              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-[13px] outline-none"
                style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#E9EDE9" }}
              >
                <option>Impresión digital</option>
                <option>Copias / Engargolado</option>
                <option>Planos</option>
                <option>Artes gráficas</option>
                <option>Stickers</option>
                <option>PVC</option>
                <option>Sublimación</option>
                <option>Pines / Fotobotones</option>
                <option>Escaneo</option>
                <option>Otro</option>
              </select>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="¿Qué necesitas? (medidas, cantidad, material…)"
                className="w-full rounded-xl px-3 py-2 text-[13px] outline-none resize-none"
                style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#E9EDE9" }}
              />

              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                Mientras más detalles pongas, ¡más rápido te cotizamos!
              </p>
            </div>
          </div>

          {/* ── Barra inferior tipo WhatsApp ── */}
          <div
            className="flex items-center gap-2 px-3 py-2.5"
            style={{ backgroundColor: "#202C33", borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            {/* Preview del mensaje */}
            <div
              className="flex-1 rounded-full px-4 py-2 text-[12px] truncate"
              style={{ backgroundColor: "#2A3942", color: "#8696A0" }}
            >
              {name.trim() ? `Hola, ${brand}. Mi nombre es ${name.trim()}…` : "Escribe tu consulta arriba…"}
            </div>

            {/* Botón enviar */}
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition hover:scale-105"
              style={{ backgroundColor: "#25D366" }}
              aria-label="Abrir WhatsApp"
              title="Abrir en WhatsApp"
            >
              {/* Ícono enviar */}
              <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </a>
          </div>

        </div>
      )}
    </>
  );
}
