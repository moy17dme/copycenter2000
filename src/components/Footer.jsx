// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/LOGOcopy.png";

export default function Footer() {
  return (
    <footer className="relative mt-20 text-slate-100">
      {/* Separador ondulado opcional */}
      <svg
        className="absolute -top-6 left-0 w-full h-6 text-slate-900/0"
        viewBox="0 0 1440 24"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M0,24 C240,0 480,0 720,24 C960,48 1200,48 1440,24 L1440,24 L0,24 Z"
        />
      </svg>

      {/* CTA superior */}
      <div className="px-4">
        <div className="mx-auto max-w-7xl">
          <div className="relative -mt-8 rounded-2xl shadow-xl p-6 md:p-8"
            style={{ background: 'linear-gradient(135deg, #1F4AA8 0%, #0D121B 100%)', border: '1px solid #273449' }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-lg md:text-xl font-semibold" style={{ color: '#F5F7FA' }}>
                  ¿Listo para imprimir?{" "}
                  <span className="font-normal" style={{ color: '#9AA6B2' }}>Sube tus archivos y realiza tu pedido en segundos.</span>
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/#servicios"
                  className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition"
                  style={{ backgroundColor: '#C61C1C', color: '#FFFFFF' }}
                >
                  ¡Realiza tu pedido!
                </Link>
                <Link
                  to="/precios"
                  className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium transition"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', color: '#E5ECF6' }}
                >
                  Ver precios
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cuerpo del footer */}
      <div className="mt-8" style={{ backgroundColor: '#0D121B', borderTop: '1px solid #273449' }}>

        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Marca */}
            <div>
              <div className="flex items-center gap-3">
                {/* Reemplaza src por tu logo */}
                <img
                  src={logo}
                  alt="Copy Center 2000"
                  className="h-10 w-auto"
                />
              </div>
              <p className="mt-4 text-sm" style={{ color: '#9AA6B2' }}>
                Impresiones digitales, ploteo de planos y artes gráficas con calidad y rapidez.
              </p>
              <div className="mt-4 flex gap-3">
                <SocialIcon href="https://wa.me/527713531668" label="WhatsApp">
                  <path d="M12.04 2a10 10 0 100 20 9.9 9.9 0 005.26-1.55l1.7.45-.46-1.66A9.97 9.97 0 0022.04 12 10 10 0 0012.04 2zm5.73 14.25c-.25.7-1.48 1.33-2.03 1.38-.52.05-1.18.07-1.9-.12-.44-.12-1-.32-1.73-.63-3.04-1.31-5.02-4.36-5.17-4.56-.15-.2-1.24-1.66-1.24-3.17 0-1.5.79-2.24 1.07-2.55.28-.31.61-.39.82-.39.21 0 .41.01.59.01.19 0 .44-.07.69.53.25.6.86 2.06.94 2.21.08.15.13.33.02.53-.1.2-.15.33-.3.51-.15.18-.32.41-.45.55-.15.15-.3.31-.13.61.18.31.8 1.32 1.72 2.14 1.18 1.05 2.18 1.38 2.49 1.54.31.15.5.13.69-.08.2-.2.79-.9 1.01-1.21.23-.31.43-.26.69-.16.26.1 1.64.77 1.92.9.28.13.46.2.53.31.06.11.06.65-.19 1.35z" />
                </SocialIcon>
                <SocialIcon
                  href="https://www.facebook.com/p/Copy-Center-2000-100056493007838/"
                  label="Facebook"
                >
                  <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1z" />
                </SocialIcon>
                <SocialIcon label="Instagram, enlace pendiente" disabled>
                  <path d="M7.8 2h8.4A5.8 5.8 0 0122 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8A5.8 5.8 0 012 16.2V7.8A5.8 5.8 0 017.8 2zm-.2 2A3.6 3.6 0 004 7.6v8.8A3.6 3.6 0 007.6 20h8.8a3.6 3.6 0 003.6-3.6V7.6A3.6 3.6 0 0016.4 4H7.6zm9.65 1.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5zM12 7a5 5 0 110 10 5 5 0 010-10zm0 2a3 3 0 100 6 3 3 0 000-6z" />
                </SocialIcon>
                <SocialIcon href="mailto:copy.center@hotmail.com" label="Email">
                  <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm2 0l8 6 8-6H4zm16 12V8l-8 6-8-6v10h16z" />
                </SocialIcon>
              </div>
            </div>

            {/* Servicios */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#9AA6B2' }}>
                Servicios
              </h3>
              <ul className="mt-4 space-y-2 text-sm">
                <Li href="/servicios#impresion-digital">Impresión Digital</Li>
                <Li href="/servicios#copias-engargolados">Copias B/N y Color</Li>
                <Li href="/servicios#ploteo-planos">Ploteo de Planos</Li>
                <Li href="/servicios#impresos-comerciales">Artes Gráficas</Li>
                <Li href="/servicios#digitalizacion">Escaneo y Digitalización</Li>
              </ul>
            </div>

            {/* Enlaces */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#9AA6B2' }}>
                Enlaces
              </h3>
              <ul className="mt-4 space-y-2 text-sm">
                <Li href="/">Inicio</Li>
                <Li href="/servicios">Servicios</Li>
                <Li href="/precios">Precios</Li>
                <Li href="/acerca-de">Acerca de</Li>
                <Li href="/portafolio">Portafolio</Li>
                <Li href="/recursos">Recursos de impresión</Li>
                <Li href="/preguntas-frecuentes">Preguntas frecuentes</Li>
                <Li href="/contacto">Contacto</Li>
                <Li href="/aviso-privacidad">Aviso de privacidad</Li>
                <Li href="/terminos">Términos y condiciones</Li>
              </ul>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#9AA6B2' }}>
                Contacto
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <IconMap />
                  <span>Calle Gral. Vicente Segura 301-A, col. Periodistas, 42060 Pachuca de Soto, Hidalgo</span>
                </li>
                <li className="flex items-start gap-3">
                  <IconPhone />
                  <a className="hover:underline" href="https://wa.me/527713531668">
                    WhatsApp: 771&nbsp;353&nbsp;1668
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <IconMail />
                  <a className="hover:underline" href="mailto:copy.center@hotmail.com">
                    copy.center@hotmail.com
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <IconClock />
                  <span>Lun–vie: 8:00–19:30 · Sáb: 9:00–15:00</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Línea divisoria */}
          <div className="mt-10 pt-6 text-xs flex flex-col md:flex-row items-center justify-between gap-3"
            style={{ borderTop: '1px solid #273449', color: '#9AA6B2' }}>
            <p>
              © {new Date().getFullYear()} Copy Center 2000. Todos los derechos reservados.
            </p>
            <p className="opacity-80">
              Hecho en México | <Link to="/terminos" className="hover:underline">Términos y condiciones</Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* Helpers (JSX) */
function Li({ href, children }) {
  const isExternal =
    href.startsWith("http") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:");
  const className =
    "text-slate-200/90 hover:text-white hover:translate-x-0.5 inline-flex items-center gap-2 transition";
  const content = (
    <>
      <span className="h-1.5 w-1.5 rounded-full bg-white/40" /> {children}
    </>
  );

  return (
    <li>
      {isExternal ? (
        <a href={href} className={className}>
          {content}
        </a>
      ) : (
        <Link to={href} className={className}>
          {content}
        </Link>
      )}
    </li>
  );
}

function SocialIcon({ href, label, children, disabled = false }) {
  const className = [
    "group inline-flex h-10 w-10 items-center justify-center rounded-xl transition ring-1",
    disabled
      ? "cursor-not-allowed bg-white/5 text-white/35 ring-white/5"
      : "bg-white/10 hover:bg-white/20 ring-white/10",
  ].join(" ");

  const icon = (
    <svg
      viewBox="0 0 24 24"
      className={[
        "h-5 w-5 transition",
        disabled
          ? "fill-white/35"
          : "fill-white/90 group-hover:fill-white",
      ].join(" ")}
      aria-hidden="true"
    >
      {children}
    </svg>
  );

  if (disabled || !href) {
    return (
      <span
        role="img"
        aria-label={label}
        title="Instagram: enlace pendiente"
        className={className}
      >
        {icon}
      </span>
    );
  }

  const ext = href.startsWith("http");
  return (
    <a
      href={href}
      aria-label={label}
      className={className}
      target={ext ? "_blank" : undefined}
      rel={ext ? "noopener noreferrer" : undefined}
    >
      {icon}
    </a>
  );
}

function IconMap() {
  return (
    <svg className="mt-0.5 h-5 w-5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 20l-5-2V6l5 2 6-2 5 2v12l-5-2-6 2z" />
      <circle cx="15" cy="10" r="2.25" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg className="mt-0.5 h-5 w-5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.8 19.8 0 012.07 4.2 2 2 0 014.06 2h3a2 2 0 012 1.72c.12.9.33 1.77.63 2.61a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.47-1.13a2 2 0 012.11-.45c.84.3 1.71.51 2.61.63A2 2 0 0122 16.92z" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg className="mt-0.5 h-5 w-5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg className="mt-0.5 h-5 w-5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
