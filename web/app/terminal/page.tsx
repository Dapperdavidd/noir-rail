"use client";

import { useCallback, useEffect, useState } from "react";
import { Keypair } from "@stellar/stellar-sdk";
import { ASSET, POOL_ID, formatAmount } from "@/lib/config.ts";
import { fetchPoolState, type PoolState } from "@/lib/stellar.ts";
import { createWallet, clearWallet, fund, loadWallet } from "@/lib/wallet.ts";
import { loadNotes, type StoredNote } from "@/lib/notes.ts";
import { ShieldDialog } from "@/components/ShieldDialog.tsx";
import { WithdrawDialog } from "@/components/WithdrawDialog.tsx";

const short = (s: string, n = 4) => (s.length > 2 * n ? `${s.slice(0, n)}…${s.slice(-n)}` : s);

export default function Terminal() {
  const [wallet, setWallet] = useState<Keypair | null>(null);
  const [pool, setPool] = useState<PoolState | null>(null);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [notes, setNotes] = useState<StoredNote[]>([]);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [shieldOpen, setShieldOpen] = useState(false);
  const [withdrawNote, setWithdrawNote] = useState<StoredNote | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const refreshPool = useCallback(async (src: string) => {
    try {
      setPool(await fetchPoolState(src));
      setPoolError(null);
    } catch (e) {
      setPoolError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    const kp = loadWallet();
    setWallet(kp);
    setNotes(loadNotes());
    void refreshPool(kp?.publicKey() ?? "");
  }, [refreshPool]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  async function connect() {
    setBusy(true);
    try {
      const kp = await createWallet();
      setWallet(kp);
      setToast({ kind: "ok", msg: "Testnet key created & funded" });
      void refreshPool(kp.publicKey());
    } catch (e) {
      setToast({ kind: "err", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    clearWallet();
    setWallet(null);
  }

  const onSettled = (msg: string) => {
    setToast({ kind: "ok", msg });
    setNotes(loadNotes());
    if (wallet) void refreshPool(wallet.publicKey());
  };

  const liveNotes = notes.filter((n) => !n.spent);
  const totalShielded = liveNotes.reduce((s, n) => s + BigInt(n.value), 0n);

  return (
    <main className="shell">
      <Header wallet={wallet} onConnect={connect} onDisconnect={disconnect} busy={busy} />

      <section style={{ margin: "40px 0 28px" }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>The settlement terminal</div>
        <h1 className="display" style={{ fontSize: 44, maxWidth: 720 }}>
          Positions resolve <em>into focus</em>.
        </h1>
        <p className="dim" style={{ marginTop: 12, maxWidth: 560 }}>
          Shielded by default. Amounts and holders are hidden behind zero-knowledge proofs;
          reveal one only by deliberate act.
        </p>
      </section>

      {/* stats bento */}
      <div className="bento" style={{ marginBottom: 16 }}>
        <Stat span={4} label="Total value · shielded" accent="cyan">
          {wallet ? (
            <span className="shielded" style={{ fontSize: 16 }}>view ●●●●</span>
          ) : (
            <span className="num stat-value">{pool ? formatAmount(pool.balance) : "—"}</span>
          )}
          <div className="help">
            {wallet ? "visible only with your key" : "pool TVL · connect to shield"}
          </div>
        </Stat>
        <Stat span={3} label="Your positions">
          <span className="num stat-value">{liveNotes.length}</span>
          <div className="help">{liveNotes.length ? `${formatAmount(totalShielded)} ${ASSET.symbol} held` : "none yet"}</div>
        </Stat>
        <Stat span={2} label="Pool commitments">
          <span className="num stat-value amber">{pool ? pool.commitmentCount : "—"}</span>
          <div className="help">notes in the tree</div>
        </Stat>
        <Stat span={3} label="State root" accent="violet">
          <span className="mono" style={{ fontSize: 14, wordBreak: "break-all", color: "var(--violet)" }}>
            {pool ? short(pool.root, 8) : "—"}
          </span>
          <div className="help">live · Merkle commitment</div>
        </Stat>
      </div>

      {/* positions */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="between" style={{ padding: "18px 22px" }}>
          <div className="row">
            <strong style={{ fontSize: 15 }}>Positions</strong>
            <span className="eyebrow">amounts shielded by default</span>
          </div>
          <div className="row">
            <button className="btn ghost" onClick={() => setToast({ kind: "ok", msg: "Disclosure console — Phase 2" })}>
              Disclose
            </button>
            <button className="btn primary" disabled={!wallet} onClick={() => setShieldOpen(true)}>
              + Shield asset
            </button>
          </div>
        </div>
        <hr className="hairline" />

        {liveNotes.length === 0 ? (
          <div style={{ padding: 22 }}>
            <div className="empty">
              <div className="diamond">◇</div>
              <div style={{ color: "var(--ink-2)" }}>No shielded positions yet</div>
              <div className="help">{wallet ? "Shield an asset to begin." : "Connect a testnet key, then shield."}</div>
            </div>
          </div>
        ) : (
          liveNotes.map((n) => (
            <PositionRow
              key={n.commitment}
              note={n}
              revealed={!!revealed[n.commitment]}
              onToggle={() => setRevealed((r) => ({ ...r, [n.commitment]: !r[n.commitment] }))}
              onSettle={() => setWithdrawNote(n)}
            />
          ))
        )}
      </div>

      {poolError && (
        <div className="card" style={{ marginTop: 16, borderColor: "rgba(239,111,111,0.3)" }}>
          <div className="row">
            <span className="badge red">chain</span>
            <span className="dim" style={{ fontSize: 13 }}>Couldn’t read the pool: {poolError}</span>
          </div>
        </div>
      )}

      <footer className="between" style={{ marginTop: 28, color: "var(--ink-4)", fontSize: 11 }}>
        <span className="eyebrow">NoirRail · Obsidian Clearing</span>
        <span className="mono">{short(POOL_ID, 6)} · testnet</span>
      </footer>

      {shieldOpen && wallet && (
        <ShieldDialog
          wallet={wallet}
          onClose={() => setShieldOpen(false)}
          onDone={(msg) => {
            setShieldOpen(false);
            onSettled(msg);
          }}
        />
      )}
      {withdrawNote && wallet && (
        <WithdrawDialog
          wallet={wallet}
          note={withdrawNote}
          onClose={() => setWithdrawNote(null)}
          onDone={(msg) => {
            setWithdrawNote(null);
            onSettled(msg);
          }}
        />
      )}

      {toast && (
        <div className="toast">
          <span className={`badge ${toast.kind === "ok" ? "green" : "red"}`}>{toast.kind === "ok" ? "done" : "error"}</span>
          <span style={{ fontSize: 13 }}>{toast.msg}</span>
        </div>
      )}
    </main>
  );
}

function Header({
  wallet,
  onConnect,
  onDisconnect,
  busy,
}: {
  wallet: Keypair | null;
  onConnect: () => void;
  onDisconnect: () => void;
  busy: boolean;
}) {
  return (
    <header className="between" style={{ paddingTop: 8 }}>
      <div className="row" style={{ gap: 14 }}>
        <span className="display" style={{ fontSize: 22 }}>
          Noir<em>Rail</em>
        </span>
        <span className="badge cyan">Stellar · Testnet</span>
      </div>
      {wallet ? (
        <div className="row">
          <span className="badge">{short(wallet.publicKey(), 5)}</span>
          <button className="btn ghost" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        <button className={`btn ${busy ? "loading" : "primary"}`} onClick={onConnect} disabled={busy}>
          {busy ? <span className="spinner" /> : null}
          {busy ? "Funding…" : "Connect testnet key"}
        </button>
      )}
    </header>
  );
}

function Stat({
  label,
  span,
  accent,
  children,
}: {
  label: string;
  span: number;
  accent?: "cyan" | "violet" | "amber";
  children: React.ReactNode;
}) {
  return (
    <div className="card card-tight" style={{ gridColumn: `span ${span}`, minWidth: 0 }}>
      <div className="eyebrow" style={{ marginBottom: 12 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
      {accent && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 6,
            height: 6,
            borderRadius: 999,
            background: `var(--${accent})`,
            boxShadow: `0 0 8px var(--${accent})`,
          }}
        />
      )}
    </div>
  );
}

function PositionRow({
  note,
  revealed,
  onToggle,
  onSettle,
}: {
  note: StoredNote;
  revealed: boolean;
  onToggle: () => void;
  onSettle: () => void;
}) {
  const initial = note.scope.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "NR";
  return (
    <div
      className="between"
      style={{ padding: "16px 22px", borderTop: "1px solid var(--line)" }}
    >
      <div className="row" style={{ gap: 14 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: "var(--amber-dim)",
            color: "var(--amber)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
          }}
        >
          {initial}
        </div>
        <div>
          <div style={{ fontSize: 14.5 }}>{note.scope}</div>
          <div className="eyebrow">shielded note · {ASSET.symbol}</div>
        </div>
      </div>

      <div className="row" style={{ gap: 28 }}>
        <div style={{ textAlign: "right", minWidth: 150 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>balance</div>
          {revealed ? (
            <span className="revealed" style={{ fontSize: 15 }}>
              {formatAmount(BigInt(note.value))} {ASSET.symbol}
            </span>
          ) : (
            <button className="shielded" onClick={onToggle} title="reveal (deliberate act)">
              shielded ●●●●
            </button>
          )}
        </div>
        <div className="row">
          {revealed && (
            <button className="btn ghost" onClick={onToggle}>
              Hide
            </button>
          )}
          <button className="btn" onClick={onSettle}>
            Settle →
          </button>
        </div>
      </div>
    </div>
  );
}
