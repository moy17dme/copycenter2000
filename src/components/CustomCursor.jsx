// src/components/CustomCursor.jsx
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function CustomCursor() {
  const elRef = useRef(null);
  const rafRef = useRef(0);
  const posRef = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const move = (e) => {
      posRef.current.x = e.clientX;
      posRef.current.y = e.clientY;

      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const el = elRef.current;
        if (!el) return;

        const { x, y } = posRef.current;

        // ✅ posición + centrado real (sin "perderse" por contenedores)
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      });
    };

    window.addEventListener("mousemove", move, { passive: true });
    return () => {
      window.removeEventListener("mousemove", move);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ✅ Portal al body para que NUNCA lo recorte un contenedor
  return createPortal(
    <div
      ref={elRef}
      className="
        pointer-events-none fixed z-[999999]
        hidden md:block
        h-6 w-6 rounded-full
        border border-white/60
        bg-white/10 backdrop-blur
        shadow-[0_0_20px_rgba(255,255,255,0.18)]
        transition-transform duration-75
      "
      // transform se actualiza por JS
      style={{ left: 0, top: 0 }}
    />,
    document.body
  );
}
