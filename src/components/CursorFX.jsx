// src/components/CursorFX.jsx
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function CursorFX() {
  const layerRef = useRef(null);
  const coreRef = useRef(null);

  useEffect(() => {
    const layer = layerRef.current;
    const core = coreRef.current;

    // posicionadores ultrarrápidos
    const setCoreXY = gsap.quickSetter(core, "css");
    const spawnSpark = (x, y) => {
      const s = document.createElement("div");
      s.className = "absolute fx-will-change pointer-events-none";
      Object.assign(s.style, {
        left: 0,
        top: 0,
        width: "4px",
        height: "4px",
        borderRadius: "9999px",
        background:
          "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%)",
        filter: "drop-shadow(0 0 10px rgba(255,255,255,0.65))",
        mixBlendMode: "screen",
      });
      layer.appendChild(s);

      gsap.fromTo(
        s,
        { x: x - 3, y: y - 3, scale: 0.4, opacity: 1, rotate: gsap.utils.random(-20, 20) },
        {
          x: x + gsap.utils.random(-30, 30),
          y: y + gsap.utils.random(-30, 30),
          scale: gsap.utils.random(0.8, 1.6),
          opacity: 0,
          duration: gsap.utils.random(0.4, 0.9),
          ease: "power2.out",
          onComplete: () => s.remove(),
        }
      );
    };

    const onMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      // “halo” suave que sigue al puntero (cursor invisible)
      setCoreXY({ transform: `translate(${x - 10}px, ${y - 10}px)` });
      // destellos:
      if (Math.random() > 0.65) spawnSpark(x, y);
    };

    window.addEventListener("mousemove", onMove, { passive: true });

    // efecto de entrada (aparece suavemente)
    gsap.fromTo(
      core,
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 0.5, duration: 0.4, ease: "power2.out" }
    );

    return () => {
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div
      ref={layerRef}
      className="fixed inset-0 z-50 pointer-events-none"
      aria-hidden
    >
      {/* halo principal del cursor (invisible pero con glow) */}
      <div
        ref={coreRef}
        className="absolute h-5 w-5 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%)",
          filter: "drop-shadow(0 0 18px rgba(255,255,255,0.55))",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}
