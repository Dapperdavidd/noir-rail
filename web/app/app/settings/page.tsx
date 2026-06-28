"use client";

import { useEffect, useState } from "react";
import { ASSET, POOL_ID, NETWORK } from "@/lib/config.ts";
import { loadNotes } from "@/lib/notes.ts";
import { useWallet } from "@/components/app/wallet-context.tsx";
import { PageHead } from "@/components/app/PageHead.tsx";
import { ConfirmDialog } from "@/components/app/ConfirmDialog.tsx";

export default function Settings() {
  const { wallet, busy, connect, disconnect } = useWallet();
  const [noteCount, setNoteCount] = useState(0);
  const [clearOpen, setClearOpen] = useState(false);
  useEffect(() => setNoteCount(loadNotes().filter((n) => !n.spent).length), [wallet]);

  return (
    <>
      <PageHead
        eyebrow="Configuration"
        accent="ink"
        title="Settings"
        desc="Your testnet key, the network, and local note storage. Secrets live only on this device."
      />

      <div className="app-grid">
        <div className="app-tile" style={{ gridColumn: "span 7" }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Wallet</div>
          {wallet ? (
            <>
              <Field k="Public key" v={wallet.publicKey()} mono />
              <Field k="Live notes (this device)" v={String(noteCount)} />
              <button className="btn ghost" style={{ marginTop: 14 }} onClick={disconnect}>Disconnect key</button>
            </>
          ) : (
            <>
              <p className="help" style={{ marginTop: 0 }}>No key connected. Create a funded testnet key to shield and settle.</p>
              <button className={`btn ${busy ? "loading" : "primary"}`} style={{ marginTop: 14 }} onClick={connect} disabled={busy}>
                {busy ? <span className="spinner" /> : null}{busy ? "Funding…" : "Connect testnet key"}
              </button>
            </>
          )}
        </div>

        <div className="app-tile" style={{ gridColumn: "span 5" }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Network</div>
          <Field k="Chain" v="Stellar" />
          <Field k="Network" v={NETWORK ?? "testnet"} />
          <Field k="Asset" v={ASSET.symbol} />
          <Field k="Pool contract" v={POOL_ID} mono />
        </div>
      </div>

      <div className="app-tile" style={{ marginTop: 16, borderColor: "rgba(239,111,111,0.25)" }}>
        <div className="eyebrow" style={{ marginBottom: 8, color: "var(--red)" }}>Danger zone</div>
        <div className="between">
          <span className="help" style={{ marginTop: 0 }}>Clearing local data removes your stored notes and key from this browser. On-chain state is unaffected — but unspent notes become unrecoverable.</span>
          <button
            className="btn"
            style={{ borderColor: "rgba(239,111,111,0.4)", color: "var(--red)" }}
            onClick={() => setClearOpen(true)}
          >
            Clear local data
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={clearOpen}
        danger
        title="Clear local data"
        confirmLabel="Clear everything"
        body={
          <>
            This removes your stored notes and testnet key from <strong style={{ color: "var(--ink)" }}>this browser</strong>.
            On-chain state is unaffected, but any <strong style={{ color: "var(--ink)" }}>unspent notes become unrecoverable</strong>.
          </>
        }
        onCancel={() => setClearOpen(false)}
        onConfirm={() => {
          localStorage.clear();
          location.reload();
        }}
      />
    </>
  );
}

function Field({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="between" style={{ padding: "10px 0", borderBottom: "1px solid var(--line)", gap: 16 }}>
      <span className="help" style={{ marginTop: 0 }}>{k}</span>
      <span className={mono ? "mono" : ""} style={{ fontSize: 13, color: "var(--ink)", wordBreak: "break-all", textAlign: "right" }}>{v}</span>
    </div>
  );
}
