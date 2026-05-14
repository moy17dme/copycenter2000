// src/components/WhatsAppFloat.jsx
export default function WhatsAppFloat() {
  const text = encodeURIComponent(
    "Hola, me gustaría realizar un pedido desde la web."
  );
  const href = `https://wa.me/527713531668?text=${text}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed z-50 bottom-5 right-5 group"
      aria-label="Chatear por WhatsApp"
    >
      <div
        className="h-14 w-14 rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30
                   flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
      >
        {/* Ícono WhatsApp (SVG) */}
        <svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor" aria-hidden>
          <path d="M19.1 17.2c-.3-.2-.7-.3-1 .1-.3.3-.7.8-.9 1-.2.2-.5.2-.8.1-2.3-1-4-2.7-5-5.1-.1-.3-.1-.6.1-.8.2-.2.6-.6.9-1 .3-.3.3-.7.1-1-.2-.3-1.1-2.5-1.3-2.9-.2-.4-.4-.3-.6-.3h-.5c-.2 0-.4.1-.6.3-.6.6-1.1 1.4-1.2 2.3-.1 1 .1 2 .5 3 .8 1.9 2 3.5 3.5 4.9 1.5 1.4 3.2 2.5 5.1 3.3 1 .4 2 .6 3 .5.9-.1 1.7-.6 2.3-1.2.2-.2.3-.4.3-.6v-.5c0-.2.1-.4-.3-.6-.4-.2-2.6-1.1-2.9-1.3z"/>
          <path d="M26.7 5.3C24.4 3 21.4 1.8 18.2 1.8 9.6 1.8 2.7 8.7 2.7 17.3c0 2.7.7 5.3 2.1 7.6L3 30.2l5.5-1.8c2.2 1.2 4.7 1.8 7.2 1.8 8.6 0 15.5-6.9 15.5-15.5 0-3.2-1.2-6.2-3.5-8.4zm-8.1 22.7c-2.3 0-4.6-.6-6.6-1.7l-.5-.3-3.3 1.1 1.1-3.2-.3-.5c-1.2-2.1-1.8-4.4-1.8-6.8 0-7.5 6.1-13.6 13.6-13.6 3.6 0 7 1.4 9.5 3.9 2.5 2.5 3.9 5.9 3.9 9.5 0 7.5-6.1 13.6-13.6 13.6z"/>
        </svg>
      </div>

      {/* Globito descriptivo en escritorio */}
      <div
        className="absolute right-16 bottom-2 hidden md:block bg-white/90 text-slate-800
                   px-3 py-1 rounded-full text-sm shadow translate-x-2 opacity-0
                   group-hover:opacity-100 group-hover:translate-x-0 transition"
      >
        Chatea con nosotros
      </div>
    </a>
  );
}
