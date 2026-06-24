"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * An ambient feed of settlement events — the control room is alive even when the operator is idle.
 * Events are illustrative network activity (not the user's own actions): commitments appended,
 * roots advancing, nullifiers spent, proofs verified.
 */
type Kind = "commit" | "root" | "nullifier" | "proof" | "shield" | "transfer";

const KINDS: Record<Kind, { dot: string; label: (n: number) => string; tag: string }> = {
  commit: { dot: "var(--cyan)", tag: "COMMIT", label: (n) => `Commitment appended · leaf #${(84120 + n).toLocaleString()}` },
  root: { dot: "var(--violet)", tag: "ROOT", label: () => `Root advanced · 0x${rid()}…${rid()}` },
  nullifier: { dot: "var(--amber)", tag: "SPEND", label: () => `Nullifier spent · 0x${rid()}` },
  proof: { dot: "var(--green)", tag: "PROOF", label: () => `Groth16 verified · ${(28 + Math.floor(Math.random() * 22))}ms` },
  shield: { dot: "var(--cyan)", tag: "SHIELD", label: () => `Note shielded · $●●●●` },
  transfer: { dot: "var(--violet)", tag: "XFER", label: () => `Private transfer settled` },
};
const ORDER: Kind[] = ["proof", "commit", "root", "transfer", "nullifier", "shield"];
function rid() {
  return Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
}

interface Ev {
  id: number;
  kind: Kind;
  text: string;
  t: string;
}

export function ActivityStream({ max = 6 }: { max?: number }) {
  const reduce = useReducedMotion();
  const [events, setEvents] = useState<Ev[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    function emit() {
      const kind = ORDER[Math.floor(Math.random() * ORDER.length)];
      const id = seq.current++;
      const now = new Date();
      const t = now.toLocaleTimeString("en-GB", { hour12: false });
      setEvents((prev) => [{ id, kind, text: KINDS[kind].label(id), t }, ...prev].slice(0, max));
    }
    // seed a few so it never opens empty
    for (let i = 0; i < Math.min(4, max); i++) emit();
    if (reduce) return;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(() => {
        emit();
        loop();
      }, 1800 + Math.random() * 2200);
    };
    loop();
    return () => clearTimeout(timer);
  }, [max, reduce]);

  return (
    <div className="lp-window" style={{ overflow: "hidden" }}>
      <div className="lp-chrome">
        <div className="lp-dots"><i /><i /><i /></div>
        <div className="lp-urlbar">
          <span style={{ color: "var(--green)", animation: reduce ? undefined : "blink 2s ease-in-out infinite" }}>●</span>
          live activity · testnet
        </div>
        <span className="badge green" style={{ marginLeft: "auto" }}>Streaming</span>
      </div>
      <div style={{ padding: "6px 0", minHeight: 232 }}>
        <AnimatePresence initial={false}>
          {events.map((e, i) => (
            <motion.div
              key={e.id}
              layout
              initial={reduce ? false : { opacity: 0, y: -10, backgroundColor: "rgba(91,217,210,0.07)" }}
              animate={{ opacity: i === 0 ? 1 : 0.5 + 0.5 * (1 - i / max), y: 0, backgroundColor: "rgba(91,217,210,0)" }}
              exit={reduce ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], backgroundColor: { duration: 1.4 } }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px" }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: KINDS[e.kind].dot, boxShadow: `0 0 8px ${KINDS[e.kind].dot}`, flexShrink: 0 }} />
              <span className="lp-asub" style={{ width: 56, color: "var(--ink-4)" }}>{KINDS[e.kind].tag}</span>
              <span style={{ fontSize: 13, color: i === 0 ? "var(--ink)" : "var(--ink-2)", flex: 1 }}>{e.text}</span>
              <span className="num" style={{ fontSize: 11, color: "var(--ink-4)" }}>{e.t}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
