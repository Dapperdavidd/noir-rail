"use client";

import { useEffect, useRef } from "react";

/**
 * The living obsidian canvas: one 60fps rAF loop drawing depth layers behind all content.
 *
 *   · a vast low-contrast grid that parallaxes with scroll
 *   · settlement rails flowing beneath the page, with packets travelling along them
 *   · a slowly-evolving Merkle-style node constellation
 *   · proof-propagation waves emitted by scrolling
 *   · cursor-reactive illumination that brightens nearby rails and nodes
 *
 * Restrained on purpose (Linear-level, not crypto-noise): low alphas, slow speeds. Fixed,
 * pointer-events:none, paused when the tab is hidden, static single frame under reduced-motion.
 */

const CY = [91, 217, 210]; // cyan
const AM = [231, 178, 92]; // amber
const VI = [154, 140, 240]; // violet
const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

type Rail = { baseY: number; depth: number; hue: number[]; packets: { t: number; speed: number; size: number }[] };
type Node = { x: number; y: number; phase: number; amp: number; hue: number[]; depth: number };

export function LivingBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Asserted non-null at declaration so the rAF/resize closures keep a non-null type
    // (TS does not carry control-flow narrowing of const into nested closures). Safe: this runs
    // in useEffect after mount, where the canvas is present.
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0,
      H = 0,
      dpr = 1;

    // smoothed cursor + scroll-driven proof pulse
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    let scrollY = window.scrollY;
    let lastScroll = scrollY;
    let pulse = 0; // 0..1, spikes on scroll, decays
    const waves: { y: number; life: number }[] = [];

    let rails: Rail[] = [];
    let nodes: Node[] = [];
    let edges: [number, number][] = [];

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    function build() {
      // rails span the viewport at fixed fractions; they parallax + recycle with scroll
      const fractions = [0.16, 0.31, 0.46, 0.605, 0.75, 0.9];
      const hues = [CY, AM, VI, CY, VI, AM];
      rails = fractions.map((f, i) => ({
        baseY: f * H,
        depth: 0.06 + (i % 3) * 0.05,
        hue: hues[i % hues.length],
        packets: Array.from({ length: 3 }, () => ({
          t: Math.random(),
          speed: rand(0.018, 0.05) / 100,
          size: rand(1.9, 3.3),
        })),
      }));

      // node constellation — seeded across the viewport, gently bobbing, foreground parallax
      const count = Math.min(42, Math.round((W * H) / 44000));
      nodes = Array.from({ length: count }, () => ({
        x: rand(0, W),
        y: rand(0, H),
        phase: rand(0, Math.PI * 2),
        amp: rand(3, 9),
        hue: Math.random() < 0.7 ? CY : Math.random() < 0.5 ? VI : AM,
        depth: 0.12 + Math.random() * 0.18,
      }));
      // connect each node to its 2 nearest neighbours (a sparse Merkle-ish graph)
      edges = [];
      for (let i = 0; i < nodes.length; i++) {
        const d = nodes
          .map((n, j) => ({ j, dist: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2 }))
          .filter((o) => o.j !== i)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 2);
        for (const o of d) if (o.dist < (W * 0.22) ** 2) edges.push([i, o.j]);
      }
    }

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    const wrap = (v: number, max: number) => ((v % max) + max) % max;

    function frame(t: number) {
      const time = t / 1000;

      // ease cursor + scroll
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;
      scrollY = window.scrollY;
      const dScroll = scrollY - lastScroll;
      lastScroll = scrollY;
      if (Math.abs(dScroll) > 1.5) {
        pulse = Math.min(1, pulse + Math.min(0.5, Math.abs(dScroll) / 120));
        if (waves.length < 4 && Math.abs(dScroll) > 6)
          waves.push({ y: dScroll > 0 ? -20 : H + 20, life: 1 });
      }
      pulse *= 0.94;

      ctx.clearRect(0, 0, W, H);

      // ---- 1 · grid (deep layer, slow parallax) ----
      const gap = 64;
      const gx = wrap(-scrollY * 0.04, gap);
      const gy = wrap(time * 2 - scrollY * 0.04, gap);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      for (let x = (gx % gap) - gap; x < W; x += gap) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
      }
      for (let y = (gy % gap) - gap; y < H; y += gap) {
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
      }
      ctx.stroke();

      // ---- 2 · settlement rails + travelling packets ----
      for (const r of rails) {
        const y = wrap(r.baseY - scrollY * r.depth, H + 120) - 60;
        // the rail line, brightened near the cursor
        const distToMouseY = Math.abs(y - mouse.y);
        const near = Math.max(0, 1 - distToMouseY / 240);
        const baseA = 0.09 + near * 0.17;
        const grad = ctx.createLinearGradient(0, y, W, y);
        grad.addColorStop(0, rgba(r.hue, 0));
        grad.addColorStop(0.5, rgba(r.hue, baseA));
        grad.addColorStop(1, rgba(r.hue, 0));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();

        // packets
        for (const p of r.packets) {
          p.t = wrap(p.t + p.speed * (1 + pulse * 2.2), 1);
          const px = p.t * W;
          const cursorBoost = Math.max(0, 1 - Math.hypot(px - mouse.x, y - mouse.y) / 170);
          const a = 0.32 + pulse * 0.32 + cursorBoost * 0.5;
          ctx.fillStyle = rgba(r.hue, Math.min(0.88, a));
          ctx.beginPath();
          ctx.arc(px, y, p.size + cursorBoost * 1.6, 0, Math.PI * 2);
          ctx.fill();
          // faint trailing comet
          const tg = ctx.createLinearGradient(px - 26, y, px, y);
          tg.addColorStop(0, rgba(r.hue, 0));
          tg.addColorStop(1, rgba(r.hue, Math.min(0.4, a * 0.6)));
          ctx.strokeStyle = tg;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(px - 26, y);
          ctx.lineTo(px, y);
          ctx.stroke();
        }
      }

      // ---- 3 · Merkle node constellation (foreground parallax) ----
      // edges first
      for (const [a, b] of edges) {
        const na = nodes[a],
          nb = nodes[b];
        const ay = wrap(na.y - scrollY * na.depth, H + 120) - 60;
        const by = wrap(nb.y - scrollY * nb.depth, H + 120) - 60;
        const mx = (na.x + nb.x) / 2,
          my = (ay + by) / 2;
        const near = Math.max(0, 1 - Math.hypot(mx - mouse.x, my - mouse.y) / 260);
        ctx.strokeStyle = rgba(CY, 0.05 + near * 0.16);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(na.x, ay);
        ctx.lineTo(nb.x, by);
        ctx.stroke();
      }
      // nodes
      for (const n of nodes) {
        const ny = wrap(n.y - scrollY * n.depth, H + 120) - 60;
        const bob = Math.sin(time * 0.6 + n.phase) * n.amp * 0.16;
        const cursorBoost = Math.max(0, 1 - Math.hypot(n.x - mouse.x, ny - mouse.y) / 190);
        const a = 0.24 + cursorBoost * 0.55 + pulse * 0.14;
        const r = 1.8 + cursorBoost * 2.6;
        ctx.fillStyle = rgba(n.hue, Math.min(0.85, a));
        ctx.beginPath();
        ctx.arc(n.x, ny + bob, r, 0, Math.PI * 2);
        ctx.fill();
        if (cursorBoost > 0.05) {
          ctx.fillStyle = rgba(n.hue, cursorBoost * 0.1);
          ctx.beginPath();
          ctx.arc(n.x, ny + bob, r + 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ---- 4 · proof-propagation waves (scroll-triggered) ----
      for (let i = waves.length - 1; i >= 0; i--) {
        const wv = waves[i];
        wv.y += (wv.y < H / 2 ? 1 : -1) * 0; // direction baked via spawn; sweep across
        wv.life -= 0.012;
        if (wv.life <= 0) {
          waves.splice(i, 1);
          continue;
        }
        const sweepY = wv.y + (1 - wv.life) * H * (wv.y < 0 ? 1 : -1);
        const g = ctx.createLinearGradient(0, sweepY - 60, 0, sweepY + 60);
        g.addColorStop(0, rgba(CY, 0));
        g.addColorStop(0.5, rgba(CY, 0.05 * wv.life));
        g.addColorStop(1, rgba(CY, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, sweepY - 60, W, 120);
      }

      // ---- 5 · cursor illumination (soft additive pool) ----
      if (mouse.x > -1000) {
        ctx.globalCompositeOperation = "lighter";
        const r = 340;
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, r);
        g.addColorStop(0, rgba(CY, 0.09));
        g.addColorStop(0.4, rgba(CY, 0.03));
        g.addColorStop(1, rgba(CY, 0));
        ctx.fillStyle = g;
        ctx.fillRect(mouse.x - r, mouse.y - r, r * 2, r * 2);
        ctx.globalCompositeOperation = "source-over";
      }

      raf = requestAnimationFrame(frame);
    }

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
    };
    const onLeave = () => {
      mouse.tx = -9999;
      mouse.ty = -9999;
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    if (reduce) {
      // one static, composed frame — no animation
      frame(0);
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", display: "block" }}
    />
  );
}
