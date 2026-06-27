"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  hue: number;
  alpha: number;
  twinkle: number;
  twinkleSpeed: number;
};

const STAR_COUNT = 90;
const LINK_DISTANCE = 110;

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.00025,
      vy: (Math.random() - 0.5) * 0.00025,
      hue: Math.random() > 0.55 ? 300 : Math.random() > 0.5 ? 190 : 330,
      alpha: 0.25 + Math.random() * 0.45,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.015 + Math.random() * 0.025,
    }));

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }

    resize();
    window.addEventListener("resize", resize);

    function draw() {
      const w = canvas!.width;
      const h = canvas!.height;
      ctx!.clearRect(0, 0, w, h);

      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0 || s.x > 1) s.vx *= -1;
        if (s.y < 0 || s.y > 1) s.vy *= -1;
        s.twinkle += s.twinkleSpeed;
      }

      for (let i = 0; i < stars.length; i++) {
        const a = stars[i];
        const ax = a.x * w;
        const ay = a.y * h;

        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j];
          const bx = b.x * w;
          const by = b.y * h;
          const dx = ax - bx;
          const dy = ay - by;
          const dist = Math.hypot(dx, dy);

          if (dist < LINK_DISTANCE) {
            const fade = 1 - dist / LINK_DISTANCE;
            ctx!.beginPath();
            ctx!.strokeStyle = `hsla(280, 70%, 65%, ${fade * 0.12})`;
            ctx!.lineWidth = 0.6;
            ctx!.moveTo(ax, ay);
            ctx!.lineTo(bx, by);
            ctx!.stroke();
          }
        }
      }

      for (const s of stars) {
        const tw = 0.55 + Math.sin(s.twinkle) * 0.45;
        const a = s.alpha * tw;
        const px = s.x * w;
        const py = s.y * h;

        ctx!.beginPath();
        ctx!.fillStyle = `hsla(${s.hue}, 85%, 72%, ${a})`;
        ctx!.arc(px, py, s.r, 0, Math.PI * 2);
        ctx!.fill();

        if (s.r > 1.8) {
          ctx!.beginPath();
          ctx!.fillStyle = `hsla(${s.hue}, 90%, 85%, ${a * 0.35})`;
          ctx!.arc(px, py, s.r * 2.5, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="arena-mesh-blob arena-mesh-blob-pink" />
      <div className="arena-mesh-blob arena-mesh-blob-purple" />
      <div className="arena-mesh-blob arena-mesh-blob-cyan" />
      <div className="arena-mesh-blob arena-mesh-blob-fuchsia" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-75" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(2,6,23,0.55)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.15),transparent_40%,rgba(15,23,42,0.35))]" />
    </div>
  );
}
