"use client";

import { useState } from "react";
import type { Keypair } from "@stellar/stellar-sdk";
import { generateNote, depositArgs, toHex32 } from "@noir-rail/sdk";
import { ASSET, POOL_SCOPE, parseAmount, formatAmount } from "@/lib/config.ts";
import { submitDeposit } from "@/lib/stellar.ts";
import { addNote } from "@/lib/notes.ts";

type Phase = "input" | "working" | "error";

export function ShieldDialog({
  wallet,
  onClose,
  onDone,
}: {
  wallet: Keypair;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [amount, setAmount] = useState("2.5");
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState<string | null>(null);

  let units = 0n;
  try {
    units = parseAmount(amount);
  } catch {
    units = -1n;
  }
  const valid = units > 0n;

  // Live preview of the commitment that will be appended on-chain.
  let previewCommitment = "";
  if (valid) {
    try {
      previewCommitment = toHex32(generateNote(POOL_SCOPE, units).commitment);
    } catch {
      previewCommitment = "";
    }
  }

  async function shield() {
    if (!valid) return;
    setPhase("working");
    setError(null);
    try {
      const note = generateNote(POOL_SCOPE, units);
      const args = depositArgs(note);
      const hash = await submitDeposit(wallet, args.amount, args.labelHex, args.precommitmentHex);
      addNote(note, hash);
      onDone(`Shielded ${formatAmount(units)} ${ASSET.symbol}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="between" style={{ marginBottom: 20 }}>
          <strong style={{ fontSize: 15 }}>Shield an asset</strong>
          <span className="badge cyan">step · weighted</span>
        </div>

        <label className="label">Amount to shield</label>
        <input
          className={`field ${!valid && amount ? "error" : ""}`}
          value={amount}
          inputMode="decimal"
          autoFocus
          onChange={(e) => setAmount(e.target.value)}
          disabled={phase === "working"}
        />
        <div className={`help ${!valid && amount ? "err" : ""}`}>
          {!valid && amount ? "enter a positive amount" : "↳ becomes a single hidden note"}
        </div>

        <div className="card card-tight" style={{ marginTop: 16, background: "var(--bg-2)" }}>
          <div className="between" style={{ marginBottom: 8 }}>
            <span className="eyebrow">source · transparent</span>
            <span className="mono dim" style={{ fontSize: 12 }}>
              {wallet.publicKey().slice(0, 6)}…
            </span>
          </div>
          <div className="between">
            <span className="eyebrow">commitment</span>
            <span className="mono cyan" style={{ fontSize: 11 }}>
              {previewCommitment ? `0x${previewCommitment.slice(0, 10)}…` : "—"}
            </span>
          </div>
          <div className="between" style={{ marginTop: 6 }}>
            <span className="eyebrow">visible on-chain</span>
            <span className="dim" style={{ fontSize: 12 }}>commitment + amount only</span>
          </div>
        </div>

        {phase === "error" && (
          <div
            className="card card-tight"
            style={{ marginTop: 14, borderColor: "rgba(239,111,111,0.4)" }}
          >
            <span className="badge red">failed</span>
            <div className="help err" style={{ marginTop: 8 }}>{error}</div>
          </div>
        )}

        <div className="row" style={{ marginTop: 22, justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={onClose} disabled={phase === "working"}>
            Cancel
          </button>
          <button
            className={`btn ${phase === "working" ? "loading" : "primary"}`}
            onClick={shield}
            disabled={!valid || phase === "working"}
          >
            {phase === "working" ? <span className="spinner" /> : null}
            {phase === "working" ? "Shielding…" : "Generate & shield →"}
          </button>
        </div>
      </div>
    </div>
  );
}
