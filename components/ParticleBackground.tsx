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

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerR: number,
  innerR: number,
  alpha: number,
  hue: number,
  rotation: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, outerR * 1.4);
  glow.addColorStop(0, `hsla(${hue}, 95%, 92%, ${alpha * 0.95})`);
  glow.addColorStop(0.25, `hsla(${hue}, 88%, 75%, ${alpha * 0.65})`);
  glow.addColorStop(1, `hsla(${hue}, 80%, 60%, 0)`);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.restore();
}

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
        const outer = s.r * 2.8;
        const inner = outer * 0.28;
        const rot = s.twinkle * 0.15;

        drawFourPointStar(ctx!, px, py, outer, inner, a, s.hue, rot);
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
      <div className="arena-galaxy-star-wrap arena-galaxy-star-wrap-pink">
        <div className="arena-galaxy-star arena-galaxy-star-pink" />
      </div>
      <div className="arena-galaxy-star-wrap arena-galaxy-star-wrap-purple">
        <div className="arena-galaxy-star arena-galaxy-star-purple" />
      </div>
      <div className="arena-galaxy-star-wrap arena-galaxy-star-wrap-cyan">
        <div className="arena-galaxy-star arena-galaxy-star-cyan" />
      </div>
      <div className="arena-galaxy-star-wrap arena-galaxy-star-wrap-fuchsia">
        <div className="arena-galaxy-star arena-galaxy-star-fuchsia" />
      </div>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-75" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(2,6,23,0.55)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.15),transparent_40%,rgba(15,23,42,0.35))]" />
    </div>
  );
}
