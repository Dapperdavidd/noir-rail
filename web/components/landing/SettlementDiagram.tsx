"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * A persistent, low-contrast settlement flow behind the hero headline: shield → commit →
 * transfer → disclose, with packets continuously travelling the rails and each stage pulsing as
 * value passes through. Deliberately faint so the headline stays the focus.
 */
const STAGES = [
  { x: 130, label: "shield", hue: "var(--cyan)" },
  { x: 386, label: "commit", hue: "var(--violet)" },
  { x: 642, label: "transfer", hue: "var(--amber)" },
  { x: 898, label: "disclose", hue: "var(--cyan)" },
];
const Y = 96;

export function SettlementDiagram() {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: 56,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(1040px, 94vw)",
        opacity: 0.6,
        zIndex: 0,
        pointerEvents: "none",
        maskImage: "radial-gradient(ellipse 80% 90% at 50% 50%, #000 35%, transparent 78%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 90% at 50% 50%, #000 35%, transparent 78%)",
      }}
    >
      <svg viewBox="0 0 1028 192" width="100%" style={{ display: "block", overflow: "visible" }}>
        {/* the rail */}
        <line x1={STAGES[0].x} y1={Y} x2={STAGES[3].x} y2={Y} stroke="var(--line-2)" strokeWidth="1" />
        {/* branch hints above/below to suggest a network, not a single wire */}
        <path d={`M${STAGES[1].x} ${Y} C ${STAGES[1].x + 40} ${Y - 46}, ${STAGES[2].x - 40} ${Y - 46}, ${STAGES[2].x} ${Y}`} fill="none" stroke="var(--line)" strokeWidth="1" />
        <path d={`M${STAGES[0].x} ${Y} C ${STAGES[0].x + 60} ${Y + 50}, ${STAGES[2].x - 60} ${Y + 50}, ${STAGES[2].x} ${Y}`} fill="none" stroke="var(--line)" strokeWidth="1" />

        {/* stage nodes */}
        {STAGES.map((s, i) => (
          <g key={s.label}>
            {!reduce && (
              <motion.circle
                cx={s.x}
                cy={Y}
                r={10}
                fill="none"
                stroke={s.hue}
                strokeWidth="1"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 0.4, 0], scale: [0.6, 1.8, 2.2] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.9, ease: "easeOut" }}
                style={{ transformOrigin: `${s.x}px ${Y}px` }}
              />
            )}
            <circle cx={s.x} cy={Y} r={4.5} fill="var(--bg)" stroke={s.hue} strokeWidth="1.4" />
            <circle cx={s.x} cy={Y} r={1.8} fill={s.hue} />
            <text
              x={s.x}
              y={Y + 30}
              textAnchor="middle"
              fill="var(--ink-4)"
              style={{ font: "500 11px var(--font-mono), monospace", letterSpacing: "0.14em", textTransform: "uppercase" }}
            >
              {s.label}
            </text>
          </g>
        ))}

        {/* travelling packets */}
        {!reduce &&
          [0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              r={2.6}
              cy={Y}
              fill="var(--cyan)"
              initial={{ cx: STAGES[0].x, opacity: 0 }}
              animate={{
                cx: [STAGES[0].x, STAGES[1].x, STAGES[2].x, STAGES[3].x],
                opacity: [0, 1, 1, 0],
              }}
              transition={{ duration: 7, repeat: Infinity, delay: i * 2.3, ease: "linear", times: [0, 0.33, 0.66, 1] }}
            />
          ))}
      </svg>
    </div>
  );
}
