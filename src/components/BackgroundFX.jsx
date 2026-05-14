import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Utilidad para colores azules consistentes
const BLOB_CLASSES =
  "absolute rounded-full opacity-30 blur-2xl will-change-transform pointer-events-none";

export default function BackgroundFX() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const blobs = gsap.utils.toArray(".bgfx-blob");

      // Animación flotante perpetua (cada blob con parámetros aleatorios)
      blobs.forEach((el, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        gsap.to(el, {
          y: gsap.utils.random(30, 80) * dir,
          x: gsap.utils.random(-30, 30),
          rotation: gsap.utils.random(-6, 6),
          duration: gsap.utils.random(4, 8),
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
        });
      });

      // Parallax MUY sutil con scroll
      gsap.to(".bgfx-parallax-slow", {
        yPercent: 8,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2,
        },
      });
      gsap.to(".bgfx-parallax-fast", {
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2,
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    // Capa fija detrás de todo
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800"
      aria-hidden
    >
      {/* Degradé radial extra para profundidad */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_20%,rgba(59,130,246,0.25),transparent_70%)]" />

      {/* BLOBS principales */}
      <div
        className={`bgfx-blob bgfx-parallax-slow ${BLOB_CLASSES} w-[28rem] h-[28rem] left-[-8rem] top-[10%]`}
        style={{ background: "linear-gradient(135deg,#3b82f6,#22d3ee)" }}
      />
      <div
        className={`bgfx-blob bgfx-parallax-fast ${BLOB_CLASSES} w-[36rem] h-[36rem] right-[-10rem] top-[25%]`}
        style={{ background: "linear-gradient(135deg,#60a5fa,#ef4444)" }}
      />
      <div
        className={`bgfx-blob ${BLOB_CLASSES} w-[22rem] h-[22rem] left-[20%] bottom-[-8rem]`}
        style={{ background: "linear-gradient(135deg,#2563eb,#a78bfa)" }}
      />

      {/* “Ruido” sutil para textura (mezcla con el fondo) */}
      <div className="absolute inset-0 mix-blend-overlay opacity-15 bg-[url('data:image/svg+xml;utf8,\
        <svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22>\
          <defs><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%221%22 stitchTiles=%22stitch%22/></filter></defs>\
          <rect width=%2240%22 height=%2240%22 filter=%22url(%23n)%22 opacity=%220.15%22/></svg>')]" />
    </div>
  );
}
