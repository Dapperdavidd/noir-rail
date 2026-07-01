"use client";

import { useEffect, useState } from "react";
import { ASSET } from "@/lib/config.ts";
import { fetchPoolState, verifyMembershipOnChain } from "@/lib/stellar.ts";
import { loadPoolNotes, toNote, type StoredNote } from "@/lib/notes.ts";
import { proveMembership, verifyMembership } from "@/lib/disclosure.ts";
import { PageHead } from "@/components/app/PageHead.tsx";

const hexShort = (hex: string) => {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  return "0x" + (h.length > 18 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h);
};
const decToHexShort = (dec: string) => hexShort(BigInt(dec).toString(16).padStart(2, "0"));

type Result =
  | { kind: "ok"; label: string; onchain: boolean; local: boolean; stateRoot: string; approvalRoot: string; proofHex: string }
  | { kind: "error"; label: string; reason: string };

export default function Disclosure() {
  const [notes, setNotes] = useState<StoredNote[]>([]);
  const [pool, setPool] = useState<{ commitments: bigint[]; root: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    setNotes(loadPoolNotes().filter((n) => !n.spent));
    fetchPoolState("")
      .then((s) => setPool({ commitments: s.commitments.map((h) => BigInt("0x" + h)), root: s.root }))
      .catch(() => setPool({ commitments: [], root: "" }));
  }, []);

  // Phase 0: the pool admits only vetted deposits, so the pool's own commitment set IS the vetted
  // allow-list, and the contract accepts any recent pool root. Any settled position is disclosable —
  // no separate publication step, nothing goes stale.
  const approved = pool?.commitments ?? [];
  const approvalRootHex = pool?.root ?? "";
  const disclosable = notes.filter((n) => approved.some((c) => c === BigInt(n.commitment)));

  async function disclose(n: StoredNote) {
    if (!pool) return;
    setResult(null);
    setBusy(n.commitment);
    try {
      const proved = await proveMembership(toNote(n), pool.commitments, approved);
      const [onchain, local] = await Promise.all([
        verifyMembershipOnChain(proved.proofHex, proved.publicHex),
        verifyMembership(proved.proof, proved.publicSignals),
      ]);
      setResult({
        kind: "ok",
        label: n.scope,
        onchain: onchain.ok,
        local,
        stateRoot: proved.publicSignals[0],
        approvalRoot: proved.publicSignals[1],
        proofHex: proved.proofHex,
      });
    } catch (e) {
      setResult({ kind: "error", label: n.scope, reason: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHead
        eyebrow="Audit"
        accent="amber"
        title="Disclosure"
        desc="Prove a fact about a sealed position without unsealing it — here, that a holding is a member of the compliance-vetted set — and have it checked on Stellar. The proof is generated in your browser and verified by the on-chain contract; it reveals nothing but two Merkle roots, never the amount, the owner, or which deposit."
      />

      <div className="app-grid">
        <div className="app-tile mob-half" style={{ gridColumn: "span 4" }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Predicate</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            deposit ∈ vetted set
          </div>
          <div className="help" style={{ marginTop: 6 }}>double Merkle inclusion · Groth16 · BLS12-381</div>
        </div>
        <div className="app-tile mob-half" style={{ gridColumn: "span 4" }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Allow-list root · on-chain</div>
          <div className="mono" style={{ fontSize: 13, color: "var(--amber)", wordBreak: "break-all" }}>
            {approvalRootHex ? hexShort(approvalRootHex) : "—"}
          </div>
          <div className="help" style={{ marginTop: 6 }}>
            {pool ? `${approved.length} vetted deposits · the pool is the vetted set` : "loading…"}
          </div>
        </div>
        <div className="app-tile mob-half" style={{ gridColumn: "span 4" }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Revealed by a proof</div>
          <div style={{ fontSize: 14, color: "var(--ink)" }}>two roots — nothing else</div>
          <div className="help" style={{ marginTop: 6 }}>not the amount · owner · which note</div>
        </div>
      </div>

      <div className="app-tile" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
        <div className="between" style={{ padding: "18px 22px" }}>
          <div className="row">
            <strong style={{ fontSize: 15 }}>Your positions</strong>
            <span className="eyebrow">disclose membership, not value</span>
          </div>
          <span className="app-netpill" style={{ padding: "6px 10px" }}>
            <i style={{ background: "var(--green)", boxShadow: "0 0 8px var(--green)" }} /> verified on Stellar
          </span>
        </div>
        <hr className="hairline" />

        {!pool ? (
          <div style={{ padding: 22 }}>
            <div className="row"><span className="spinner" /><span className="dim" style={{ fontSize: 13 }}>Reading the pool…</span></div>
          </div>
        ) : disclosable.length === 0 ? (
          <div style={{ padding: 22 }}>
            <div className="empty">
              <div className="diamond">◐</div>
              <div style={{ color: "var(--ink-2)" }}>No settled positions to disclose</div>
              <div className="help">Shield a position in the terminal, then return here to prove it’s in the vetted set.</div>
            </div>
          </div>
        ) : (
          disclosable.map((n) => {
            const initial = n.scope.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "NR";
            const working = busy === n.commitment;
            return (
              <div key={n.commitment} className="between pos-row" style={{ padding: "16px 22px", borderTop: "1px solid var(--line)" }}>
                <div className="row" style={{ gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--amber-dim)", color: "var(--amber)", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                    {initial}
                  </div>
                  <div>
                    <div style={{ fontSize: 14.5 }}>{n.scope}</div>
                    <div className="eyebrow">shielded note · {ASSET.symbol}</div>
                  </div>
                </div>
                <div className="row pos-row-actions" style={{ gap: 20 }}>
                  <div style={{ textAlign: "right", minWidth: 120 }}>
                    <div className="eyebrow" style={{ marginBottom: 6 }}>balance (yours only)</div>
                    <span className="shielded" style={{ fontSize: 13 }}>shielded ●●●●</span>
                  </div>
                  <button className={`btn ${working ? "loading" : "primary"}`} onClick={() => disclose(n)} disabled={busy !== null}>
                    {working ? <span className="spinner" /> : null}
                    {working ? "Proving…" : "Disclose on-chain →"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {result && (
        <div
          className="app-tile"
          style={{ marginTop: 16, borderColor: result.kind === "ok" && result.onchain ? "rgba(111,208,140,0.4)" : "rgba(239,111,111,0.4)" }}
        >
          {result.kind === "ok" ? (
            <>
              <div className="row" style={{ marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <span className={`badge ${result.onchain ? "green" : "red"}`}>{result.onchain ? "verified on Stellar" : "chain rejected"}</span>
                <span className={`badge ${result.local ? "cyan" : "red"}`}>{result.local ? "verified in browser" : "local failed"}</span>
                <strong style={{ fontSize: 15 }}>Membership disclosed</strong>
              </div>
              <p className="help" style={{ marginTop: 0, marginBottom: 16 }}>
                The Soroban contract verified the proof against the pool's vetted set. An auditor learns the holder controls
                a vetted position — and that is <em style={{ color: "var(--ink)", fontStyle: "normal" }}>all</em> they learn.
              </p>
              <div className="app-grid" style={{ gap: 12 }}>
                <Disclosed label="state root (public)" value={result.stateRoot} tone="violet" />
                <Disclosed label="allow-list root (public)" value={result.approvalRoot} tone="amber" />
              </div>
              <div className="card card-tight" style={{ marginTop: 12, background: "var(--bg-2)" }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>sealed — never left the device</div>
                <div className="help" style={{ marginTop: 0 }}>amount · owner · which of the {pool?.commitments.length ?? 0} deposits</div>
              </div>
            </>
          ) : (
            <>
              <div className="row" style={{ marginBottom: 10 }}>
                <span className="badge red">error</span>
                <strong style={{ fontSize: 15 }}>Could not disclose</strong>
              </div>
              <div className="help err" style={{ marginTop: 0 }}>{result.reason}</div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function Disclosed({ label, value, tone }: { label: string; value: string; tone: "violet" | "amber" }) {
  return (
    <div className="mob-half" style={{ gridColumn: "span 6", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 12.5, color: `var(--${tone})`, wordBreak: "break-all" }}>{decToHexShort(value)}</div>
    </div>
  );
}
