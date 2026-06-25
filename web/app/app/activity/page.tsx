import { ActivityStream } from "@/components/ActivityStream.tsx";
import { PageHead } from "@/components/app/PageHead.tsx";

const LEGEND = [
  { c: "cyan", t: "Shield", d: "A commitment is appended; value leaves public view." },
  { c: "violet", t: "Transfer", d: "One note spent, two minted — amounts hidden." },
  { c: "amber", t: "Unshield", d: "A nullifier is spent; value re-enters daylight." },
];

export default function Activity() {
  return (
    <>
      <PageHead
        eyebrow="Live feed"
        accent="green"
        title="Activity"
        desc="The settlement stream — shields, transfers, and unshields propagating across the pool. The chain reveals only nullifiers, commitments, and roots; never amounts or owners."
      />

      <div className="app-grid" style={{ marginBottom: 16 }}>
        <Ctx span={4} k="Finality" v="3–5s" sub="Stellar consensus" />
        <Ctx span={4} k="Per settlement" v="1 pairing" sub="Groth16 · BLS12-381" />
        <Ctx span={4} k="Revealed on-chain" v="nullifiers · roots" sub="never amounts or owners" />
      </div>

      <div className="app-grid">
        <div className="app-tile" style={{ gridColumn: "span 8" }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Settlement stream · live</div>
          <ActivityStream max={14} />
        </div>
        <div className="app-tile" style={{ gridColumn: "span 4" }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Reading the stream</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {LEGEND.map((l) => (
              <div key={l.t} className="row" style={{ alignItems: "flex-start", gap: 10 }}>
                <span style={{ marginTop: 5, width: 8, height: 8, borderRadius: 999, flexShrink: 0, background: `var(--${l.c})`, boxShadow: `0 0 8px var(--${l.c})` }} />
                <div>
                  <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{l.t}</div>
                  <div className="help" style={{ marginTop: 2 }}>{l.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Ctx({ k, v, sub, span }: { k: string; v: string; sub: string; span: number }) {
  return (
    <div className="app-tile mob-half" style={{ gridColumn: `span ${span}` }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>{k}</div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.02em", color: "var(--ink)" }}>{v}</div>
      <div className="help" style={{ marginTop: 4 }}>{sub}</div>
    </div>
  );
}
