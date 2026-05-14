// src/components/ParticlesFX.jsx
import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

const COUNT = 60;

export default function ParticlesFX() {
  const ref = useRef(null);

  const nodes = useMemo(
    () => Array.from({ length: COUNT }).map((_, i) => ({ id: i })),
    []
  );

  useEffect(() => {
    const ctx = gsap.context(() => {
      const parts = gsap.utils.toArray(".fx-particle");

      parts.forEach((el, i) => {
        // posición inicial aleatoria dentro del viewport
        gsap.set(el, {
          xPercent: -50,
          yPercent: -50,
          x: gsap.utils.random(0, window.innerWidth),
          y: gsap.utils.random(0, window.innerHeight),
          scale: gsap.utils.random(0.6, 1.2),
          opacity: gsap.utils.random(0.18, 0.35),
        });

        // flotado perpetuo
        gsap.to(el, {
          x: `+=${gsap.utils.random(-30, 30)}`,
          y: `+=${gsap.utils.random(-25, 25)}`,
          duration: gsap.utils.random(4, 8),
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: i * 0.05,
        });
      });

      // Parallax sutil con scroll
      gsap.to(".fx-particle", {
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={ref}
      className="fixed inset-0 -z-5 pointer-events-none overflow-hidden"
      aria-hidden
    >
      {nodes.map((n) => (
        <div
          key={n.id}
          className="fx-particle fx-will-change absolute h-2 w-2 rounded-full"
          style={{
            // puntito suave con glow
            background:
              "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.0) 70%)",
            filter: "drop-shadow(0 0 8px rgba(255,255,255,0.35))",
            mixBlendMode: "screen",
          }}
        />
      ))}
    </div>
  );
}
