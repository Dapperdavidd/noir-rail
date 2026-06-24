import { PageHead } from "@/components/app/PageHead.tsx";

export default function Disclosure() {
  const layers = [
    { n: "01", t: "Viewing keys", d: "Hand a derived read-only key to an auditor or fund administrator — standing line of sight into a stream of positions, scoped by asset, counterparty, or time window, revocable at the next note rotation. Never spend authority.", accent: "cyan" },
    { n: "02", t: "Disclosure proofs", d: "Prove a single predicate about hidden state — “balance under a cap”, “asset on an allow-list”, “counterparty sanctioned-clear” — without transmitting the figure. The verifier learns the answer, never the inputs.", accent: "amber" },
    { n: "03", t: "Association sets", d: "Prove membership in an approved set of vetted deposits at spend, so compliant flow never mixes with illicit funds — without revealing which member you are.", accent: "violet" },
  ];
  return (
    <>
      <PageHead
        eyebrow="Audit"
        accent="amber"
        title={<>Disclosure <span className="badge amber" style={{ verticalAlign: "middle", marginLeft: 8 }}>Phase 2</span></>}
        desc="Auditability without surveillance. The right party sees the right thing; no one sees everything; there is no master key. Three independent layers deliver it — shipping in Phase 2 of the build plan."
      />

      <div className="app-grid">
        {layers.map((l) => (
          <div key={l.n} className="app-tile" style={{ gridColumn: "span 4" }}>
            <span style={{ position: "absolute", top: 18, right: 18, width: 7, height: 7, borderRadius: 999, background: `var(--${l.accent})`, boxShadow: `0 0 8px var(--${l.accent})` }} />
            <div className="num" style={{ color: `var(--${l.accent})`, fontSize: 13 }}>{l.n}</div>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17, color: "var(--ink)", margin: "12px 0 8px", letterSpacing: "-0.02em" }}>{l.t}</h3>
            <p className="help" style={{ marginTop: 0, lineHeight: 1.6 }}>{l.d}</p>
          </div>
        ))}
      </div>

      <div className="app-tile" style={{ marginTop: 16, textAlign: "center", borderStyle: "dashed", padding: 36 }}>
        <div className="diamond" style={{ fontSize: 26 }}>◐</div>
        <div style={{ color: "var(--ink-2)", marginTop: 10 }}>The disclosure console arrives in Phase 2</div>
        <div className="help" style={{ marginTop: 4, maxWidth: "44ch", marginInline: "auto" }}>
          Build a predicate, scope a recipient, and anchor a tamper-evident attestation on-chain —
          all without unsealing a single figure.
        </div>
      </div>
    </>
  );
}
