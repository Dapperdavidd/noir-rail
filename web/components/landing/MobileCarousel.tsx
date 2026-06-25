"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Mobile-only horizontal carousel. On desktop it renders nothing (the section's
 * grid is shown instead via CSS); on phones it's a scroll-snap track that
 * auto-advances slowly, scales/fades the centered card to the front, and loops
 * back to the start at the end — an infinite-feeling reveal. Manual swipe pauses
 * the auto-advance briefly, and it stays still under prefers-reduced-motion.
 */
export function MobileCarousel<T>({
  items,
  render,
  className = "",
  interval = 3400,
}: {
  items: T[];
  render: (item: T, i: number) => ReactNode;
  className?: string;
  interval?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const paused = useRef(false);
  const inView = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track which card sits closest to the centre of the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      Array.from(el.children).forEach((c, i) => {
        const node = c as HTMLElement;
        const cc = node.offsetLeft + node.clientWidth / 2;
        const d = Math.abs(cc - center);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setActive(best);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [items.length]);

  // Only auto-advance while the carousel is on screen — otherwise an off-screen
  // track would never need to move (and we avoid any wasted work).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (inView.current = e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Slow auto-advance, wrapping back to the first card at the end. We scroll the
  // track horizontally ourselves (never scrollIntoView) so the page never jumps.
  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const id = setInterval(() => {
      if (paused.current || !inView.current) return;
      const next = (active + 1) % items.length;
      const node = el.children[next] as HTMLElement | undefined;
      if (!node) return;
      const left = node.offsetLeft + node.clientWidth / 2 - el.clientWidth / 2;
      el.scrollTo({ left, behavior: "smooth" });
    }, interval);
    return () => clearInterval(id);
  }, [active, items.length, interval, reduce]);

  const pause = () => {
    paused.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  };
  const resume = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => (paused.current = false), 2600);
  };

  return (
    <div
      ref={ref}
      className={`mcar ${className}`}
      onPointerDown={pause}
      onPointerUp={resume}
      onPointerCancel={resume}
      aria-roledescription="carousel"
    >
      {items.map((it, i) => (
        <div key={i} className={`mcar-item ${i === active ? "active" : ""}`} aria-hidden={i !== active}>
          {render(it, i)}
        </div>
      ))}
    </div>
  );
}
