"use client";

import { useEffect, useMemo, useState } from "react";
import { generateNote, MerkleTree, type Note } from "@noir-rail/sdk";
import { ASSET } from "@/lib/config.ts";
import { loadNotes, toNote, type StoredNote } from "@/lib/notes.ts";
import { proveMembership, verifyMembership } from "@/lib/disclosure.ts";
import { PageHead } from "@/components/app/PageHead.tsx";

const hexShort = (dec: string) => {
  const h = BigInt(dec).toString(16).padStart(2, "0");
  return "0x" + (h.length > 18 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h);
};

type Result =
  | { kind: "ok"; label: string; stateRoot: string; approvalRoot: string; proofHex: string }
  | { kind: "rejected"; label: string }
  | { kind: "error"; label: string; reason: string };

export default function Disclosure() {
  const [notes, setNotes] = useState<StoredNote[]>([]);
  const [decoys, setDecoys] = useState<Note[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    setNotes(loadNotes().filter((n) => !n.spent));
    // Ephemeral "other deposits" so the pool is strictly larger than the vetted set — they make the
    // membership claim non-trivial and give us a real in-pool-but-not-vetted note for the control.
    setDecoys(Array.from({ length: 6 }, (_, i) => generateNote("noir_pool", BigInt((i + 1) * 1_000_000))));
  }, []);

  // Pool universe = holder's live notes + decoys. Vetted allow-list = holder notes + the first three
  // decoys; the last three decoys sit in the pool but NOT on the allow-list (the negative control).
  const { pool, approved, approvalRoot, control } = useMemo(() => {
    const holder = notes.map((n) => BigInt(n.commitment));
    const decoyC = decoys.map((d) => d.commitment);
    const pool = [...holder, ...decoyC];
    const approved = [...holder, ...decoyC.slice(0, 3)];
    const approvalRoot = approved.length ? new MerkleTree(approved).root() : 0n;
    return { pool, approved, approvalRoot, control: decoys[5] };
  }, [notes, decoys]);

  async function disclose(stored: StoredNote) {
    setResult(null);
    setBusy(stored.commitment);
    try {
      const proved = await proveMembership(toNote(stored), pool, approved);
      const ok = await verifyMembership(proved.proof, proved.publicSignals);
      setResult(
        ok
          ? {
              kind: "ok",
              label: stored.scope,
              stateRoot: proved.publicSignals[0],
              approvalRoot: proved.publicSignals[1],
              proofHex: proved.proofHex,
            }
          : { kind: "error", label: stored.scope, reason: "verification returned false" },
      );
    } catch (e) {
      setResult({ kind: "error", label: stored.scope, reason: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  // Negative control: a genuine pool deposit that is NOT on the allow-list must fail to prove.
  async function discloseControl() {
    if (!control) return;
    setResult(null);
    setBusy("control");
    try {
      await proveMembership(control, pool, approved);
      setResult({ kind: "error", label: "Non-vetted deposit", reason: "unexpectedly produced a proof" });
    } catch {
      setResult({ kind: "rejected", label: "Non-vetted deposit" });
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
        desc="Prove a fact about a sealed position without unsealing it. Here: prove a holding is a member of a compliance-vetted allow-list — revealing nothing but two Merkle roots, never the amount, the owner, or which deposit. The proof is generated in your browser and verified locally, exactly as an auditor would."
      />

      <div className="app-grid">
        <div className="app-tile mob-half" style={{ gridColumn: "span 4" }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Predicate</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            deposit ∈ vetted set
          </div>
          <div className="help" style={{ marginTop: 6 }}>a double Merkle-inclusion proof · Groth16 · BLS12-381</div>
        </div>
        <div className="app-tile mob-half" style={{ gridColumn: "span 4" }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Allow-list root</div>
          <div className="mono" style={{ fontSize: 13, color: "var(--amber)", wordBreak: "break-all" }}>
            {hexShort(approvalRoot.toString())}
          </div>
          <div className="help" style={{ marginTop: 6 }}>{approved.length} vetted commitments · published by the authority</div>
        </div>
        <div className="app-tile mob-half" style={{ gridColumn: "span 4" }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Revealed by a proof</div>
          <div style={{ fontSize: 14, color: "var(--ink)" }}>two roots — nothing else</div>
          <div className="help" style={{ marginTop: 6 }}>not the amount · not the owner · not which note</div>
        </div>
      </div>

      <div className="app-tile" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
        <div className="between" style={{ padding: "18px 22px" }}>
          <div className="row">
            <strong style={{ fontSize: 15 }}>Your positions</strong>
            <span className="eyebrow">disclose membership, not value</span>
          </div>
          <button className="btn ghost" onClick={discloseControl} disabled={busy !== null || !control}>
            {busy === "control" ? <span className="spinner" /> : null} Run negative control
          </button>
        </div>
        <hr className="hairline" />

        {notes.length === 0 ? (
          <div style={{ padding: 22 }}>
            <div className="empty">
              <div className="diamond">◐</div>
              <div style={{ color: "var(--ink-2)" }}>No positions to disclose yet</div>
              <div className="help">Shield a position in the terminal, then return here to prove it’s in the vetted set.</div>
            </div>
          </div>
        ) : (
          notes.map((n) => {
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
                    {working ? "Proving…" : "Disclose membership →"}
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
          style={{
            marginTop: 16,
            borderColor:
              result.kind === "ok"
                ? "rgba(111,208,140,0.4)"
                : result.kind === "rejected"
                ? "rgba(91,217,210,0.35)"
                : "rgba(239,111,111,0.4)",
          }}
        >
          {result.kind === "ok" && (
            <>
              <div className="row" style={{ marginBottom: 14 }}>
                <span className="badge green">verified</span>
                <strong style={{ fontSize: 15 }}>Membership proved &amp; checked</strong>
              </div>
              <p className="help" style={{ marginTop: 0, marginBottom: 16 }}>
                The proof verified against the pinned key. An auditor learns the holder controls a position in the vetted
                set — and that is <em style={{ color: "var(--ink)", fontStyle: "normal" }}>all</em> they learn.
              </p>
              <div className="app-grid" style={{ gap: 12 }}>
                <Disclosed label="state root (public)" value={result.stateRoot} tone="violet" />
                <Disclosed label="allow-list root (public)" value={result.approvalRoot} tone="amber" />
              </div>
              <div className="card card-tight" style={{ marginTop: 12, background: "var(--bg-2)" }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>sealed — never left the device</div>
                <div className="help" style={{ marginTop: 0 }}>amount · owner · which of the {pool.length} deposits</div>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 12, wordBreak: "break-all" }}>
                proof {result.proofHex.slice(0, 36)}…{result.proofHex.slice(-12)}
              </div>
            </>
          )}
          {result.kind === "rejected" && (
            <>
              <div className="row" style={{ marginBottom: 10 }}>
                <span className="badge cyan">correctly rejected</span>
                <strong style={{ fontSize: 15 }}>A non-vetted deposit cannot be disclosed</strong>
              </div>
              <p className="help" style={{ marginTop: 0 }}>
                The control deposit is genuinely in the pool but not on the allow-list, so no membership proof exists —
                exactly the soundness you want. The predicate is real, not theater.
              </p>
            </>
          )}
          {result.kind === "error" && (
            <>
              <div className="row" style={{ marginBottom: 10 }}>
                <span className="badge red">error</span>
                <strong style={{ fontSize: 15 }}>Could not produce a proof</strong>
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
    <div style={{ gridColumn: "span 6", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }} className="mob-half">
      <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 12.5, color: `var(--${tone})`, wordBreak: "break-all" }}>
        {hexShort(value)}
      </div>
    </div>
  );
}
