"use client";

import { useState } from "react";
import type { Keypair } from "@stellar/stellar-sdk";
import { ASSET, formatAmount } from "@/lib/config.ts";
import { fetchPoolState, submitWithdraw } from "@/lib/stellar.ts";
import { markSpent, toNote, type StoredNote } from "@/lib/notes.ts";
import { proveWithdraw } from "@/lib/prove.ts";

type Phase = "input" | "proving" | "submitting" | "error";

export function WithdrawDialog({
  wallet,
  note,
  onClose,
  onDone,
}: {
  wallet: Keypair;
  note: StoredNote;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [recipient, setRecipient] = useState(wallet.publicKey());
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState<string | null>(null);

  const validRecipient = /^[GC][A-Z0-9]{55}$/.test(recipient.trim());

  async function settle() {
    if (!validRecipient) return;
    setError(null);
    try {
      setPhase("proving");
      const state = await fetchPoolState(wallet.publicKey());
      const { proofHex, publicHex } = await proveWithdraw(
        toNote(note),
        state.commitments,
        recipient.trim(),
      );
      setPhase("submitting");
      const hash = await submitWithdraw(wallet, proofHex, publicHex);
      markSpent(note.commitment, hash);
      onDone(`Unshielded ${formatAmount(BigInt(note.value))} ${ASSET.symbol}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/StaleRoot|root/i.test(msg) ? "Stale root · rebuild & retry" : msg);
      setPhase("error");
    }
  }

  const working = phase === "proving" || phase === "submitting";

  return (
    <div className="overlay" onClick={working ? undefined : onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="between" style={{ marginBottom: 20 }}>
          <strong style={{ fontSize: 15 }}>Settle · unshield</strong>
          <span className="badge violet">zk proof</span>
        </div>

        <div className="card card-tight" style={{ background: "var(--bg-2)", marginBottom: 16 }}>
          <div className="between">
            <span className="eyebrow">unshielding</span>
            <span className="revealed" style={{ fontSize: 15 }}>
              {formatAmount(BigInt(note.value))} {ASSET.symbol}
            </span>
          </div>
          <div className="help">the amount is revealed at the exit · the note is consumed</div>
        </div>

        <label className="label">Recipient (bound into the proof)</label>
        <input
          className={`field ${recipient && !validRecipient ? "error" : ""}`}
          style={{ fontSize: 13 }}
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          disabled={working}
        />
        <div className={`help ${recipient && !validRecipient ? "err" : ""}`}>
          {recipient && !validRecipient
            ? "not a valid Stellar address"
            : "a watcher cannot redirect this payout"}
        </div>

        {working && (
          <div className="card card-tight" style={{ marginTop: 16, background: "var(--bg-2)" }}>
            <div className="row">
              <span className="spinner" />
              <span className="dim" style={{ fontSize: 13 }}>
                {phase === "proving"
                  ? "Generating Groth16 proof in your browser…"
                  : "Verifying on-chain & settling…"}
              </span>
            </div>
            <div className="help">secrets never leave this device</div>
          </div>
        )}

        {phase === "error" && (
          <div
            className="card card-tight"
            style={{ marginTop: 14, borderColor: "rgba(239,111,111,0.4)" }}
          >
            <span className="badge red">proof rejected</span>
            <div className="help err" style={{ marginTop: 8 }}>{error}</div>
          </div>
        )}

        <div className="row" style={{ marginTop: 22, justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={onClose} disabled={working}>
            Cancel
          </button>
          <button
            className={`btn ${working ? "loading" : "primary"}`}
            onClick={settle}
            disabled={!validRecipient || working}
          >
            {working ? <span className="spinner" /> : null}
            {phase === "proving" ? "Proving…" : phase === "submitting" ? "Settling…" : "Prove & settle →"}
          </button>
        </div>
      </div>
    </div>
  );
}
