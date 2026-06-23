"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type CSSProperties } from "react";
import { ShieldedValue } from "./ui";

/** A floating, lightly-alive mock of the NoirRail settlement terminal — the hero centerpiece. */
export function TerminalMock() {
  const reduce = useReducedMotion();
  const [progress, setProgress] = useState(62);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (reduce) {
      setProgress(100);
      return;
    }
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setSettled(true);
          setTimeout(() => {
            setSettled(false);
            setProgress(8);
          }, 2200);
          return 100;
        }
        return Math.min(100, p + 2);
      });
    }, 90);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <div
      className="lp-window torch"
      style={{ position: "relative", ["--torch" as string]: "rgba(91,217,210,0.13)", ["--accent" as string]: "rgba(91,217,210,0.45)" } as CSSProperties}
    >
      {!reduce && <div className="lp-scanline" />}
      <div className="lp-chrome">
        <div className="lp-dots">
          <i style={{ background: "#3a2530" }} />
          <i style={{ background: "#3a3325" }} />
          <i style={{ background: "#253a2c" }} />
        </div>
        <div className="lp-urlbar">
          <span style={{ color: "var(--green)" }}>◎</span> app.noirrail.xyz / terminal
        </div>
        <span className="badge cyan" style={{ marginLeft: "auto" }}>Shielded</span>
      </div>

      {/* summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderBottom: "1px solid var(--line)" }}>
        {[
          { k: "Total value · shielded", v: <ShieldedValue value="48,210,500.00" prefix="$" className="num" /> },
          { k: "Disclosed this month", v: <span className="num revealed">$2.40M</span> },
          { k: "Pending settlement", v: <span className="num" style={{ color: "var(--amber)" }}>1</span> },
        ].map((s, i) => (
          <div key={i} style={{ padding: "16px 18px", borderRight: i < 2 ? "1px solid var(--line)" : "none" }}>
            <div className="lp-asub" style={{ marginBottom: 8 }}>{s.k}</div>
            <div style={{ fontSize: 18 }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* positions */}
      <Row tk="t" tone="t" name="US T-Bill · 13W" sub="Franklin · BENJI" yield_="4.28%">
        <ShieldedValue value="12,500,000.00" prefix="$" className="num" />
      </Row>
      <Row tk="iv" tone="iv" name="Invoice Note · Q3" sub="Receivable · 90D" status="Disclosed">
        <span className="num revealed">$1,250,000</span>
      </Row>
      <Row tk="pc" tone="pc" name="Private Credit · A" sub="Tranche · Senior" yield_="9.10%">
        <ShieldedValue value="9,300,000.00" prefix="$" className="num" />
      </Row>

      {/* settling row with a live proof */}
      <div className="lp-glassrow" style={{ background: "rgba(91,217,210,0.04)" }}>
        <div className="lp-asset">
          <span className="lp-asset tk t" style={{ width: 34, height: 34 }}>T</span>
          <div>
            <div className="lp-aname">US T-Bill · 26W</div>
            <div className="lp-asub" style={{ color: settled ? "var(--green)" : "var(--cyan)" }}>
              {settled ? "Settled ✓" : "Settling…"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="lp-asub">{settled ? "on testnet" : "proof"}</div>
          <ProofRing progress={progress} settled={settled} />
        </div>
      </div>
    </div>
  );
}

function Row({
  tk,
  tone,
  name,
  sub,
  yield_,
  status,
  children,
}: {
  tk: string;
  tone: "t" | "iv" | "pc";
  name: string;
  sub: string;
  yield_?: string;
  status?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="lp-glassrow">
      <div className="lp-asset">
        <span className={`tk ${tone}`}>{tk.toUpperCase()}</span>
        <div>
          <div className="lp-aname">{name}</div>
          <div className="lp-asub">{sub}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {yield_ && (
          <div style={{ textAlign: "right" }}>
            <div className="lp-asub">Yield · APY</div>
            <div className="num" style={{ color: "var(--green)", fontSize: 13 }}>{yield_}</div>
          </div>
        )}
        {status && (
          <div style={{ textAlign: "right" }}>
            <div className="lp-asub">Status</div>
            <div style={{ color: "var(--amber)", fontSize: 13 }}>{status}</div>
          </div>
        )}
        <div style={{ minWidth: 132, textAlign: "right" }}>{children}</div>
      </div>
    </div>
  );
}

function ProofRing({ progress, settled }: { progress: number; settled: boolean }) {
  const R = 13;
  const C = 2 * Math.PI * R;
  return (
    <div style={{ position: "relative", width: 34, height: 34 }}>
      <svg width="34" height="34" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="17" cy="17" r={R} fill="none" stroke="var(--line-2)" strokeWidth="2.5" />
        <motion.circle
          cx="17"
          cy="17"
          r={R}
          fill="none"
          stroke={settled ? "var(--green)" : "var(--cyan)"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={C}
          animate={{ strokeDashoffset: C - (C * progress) / 100 }}
          transition={{ ease: "linear", duration: 0.1 }}
        />
      </svg>
      <span
        className="num"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          color: settled ? "var(--green)" : "var(--cyan)",
        }}
      >
        {settled ? "✓" : `${progress}`}
      </span>
    </div>
  );
}
