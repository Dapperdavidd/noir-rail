"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ASSET, formatAmount } from "@/lib/config.ts";
import { fetchPoolState, type PoolState } from "@/lib/stellar.ts";
import { loadPoolNotes, type StoredNote } from "@/lib/notes.ts";
import { ShieldDialog } from "@/components/ShieldDialog.tsx";
import { WithdrawDialog } from "@/components/WithdrawDialog.tsx";
import { ActivityStream } from "@/components/ActivityStream.tsx";
import { useWallet } from "@/components/app/wallet-context.tsx";
import { PageHead } from "@/components/app/PageHead.tsx";
import { Sk } from "@/components/app/Skeleton.tsx";

const short = (s: string, n = 4) => (s.length > 2 * n ? `${s.slice(0, n)}…${s.slice(-n)}` : s);

export default function Terminal() {
  const { wallet } = useWallet();
  const [pool, setPool] = useState<PoolState | null>(null);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [poolLoading, setPoolLoading] = useState(true);
  const [notes, setNotes] = useState<StoredNote[]>([]);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [shieldOpen, setShieldOpen] = useState(false);
  const [withdrawNote, setWithdrawNote] = useState<StoredNote | null>(null);
  const [revealTotal, setRevealTotal] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const refreshPool = useCallback(async (src: string) => {
    try {
      setPool(await fetchPoolState(src));
      setPoolError(null);
    } catch (e) {
      setPoolError(e instanceof Error ? e.message : String(e));
    } finally {
      setPoolLoading(false);
    }
  }, []);

  // Show skeletons only on the first load — later refreshes (after a settlement)
  // already have data, so we keep the value visible instead of flickering.
  const showPoolSk = poolLoading && !pool;

  useEffect(() => {
    setNotes(loadPoolNotes());
    void refreshPool(wallet?.publicKey() ?? "");
  }, [wallet, refreshPool]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const onSettled = (msg: string) => {
    setToast({ kind: "ok", msg });
    setNotes(loadPoolNotes());
    if (wallet) void refreshPool(wallet.publicKey());
  };

  const liveNotes = notes.filter((n) => !n.spent);
  const totalShielded = liveNotes.reduce((s, n) => s + BigInt(n.value), 0n);

  return (
    <>
      <PageHead
        eyebrow="Settle"
        accent="cyan"
        title="Terminal"
        desc="Shielded by default. Amounts and holders are hidden behind zero-knowledge proofs; reveal one only by a deliberate act, settle it on Stellar testnet in seconds."
      />

      <div className="app-grid" style={{ marginBottom: 16 }}>
        <Stat span={3} label="Total value · shielded" accent="cyan">
          {wallet ? (
            revealTotal ? (
              <button className="revealed" onClick={() => setRevealTotal(false)} style={{ fontSize: 15, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }} title="hide">
                {formatAmount(totalShielded)} {ASSET.symbol}
              </button>
            ) : (
              <button className="shielded" onClick={() => setRevealTotal(true)} style={{ fontSize: 15 }} title="reveal (your key)">
                view ●●●●
              </button>
            )
          ) : showPoolSk ? (
            <Sk w={120} h={26} r={7} />
          ) : (
            <span className="num stat-value">{pool ? formatAmount(pool.balance) : "—"}</span>
          )}
          <div className="help">{wallet ? (revealTotal ? "your shielded total · click to hide" : "click to reveal · visible only with your key") : "pool TVL · connect to shield"}</div>
        </Stat>
        <Stat span={3} label="Your positions">
          <span className="num stat-value">{liveNotes.length}</span>
          <div className="help">{liveNotes.length ? `${formatAmount(totalShielded)} ${ASSET.symbol} held` : "none yet"}</div>
        </Stat>
        <Stat span={3} label="Pool commitments" accent="amber">
          {showPoolSk ? (
            <Sk w={80} h={26} r={7} />
          ) : (
            <span className="num stat-value amber">{pool ? pool.commitmentCount : "—"}</span>
          )}
          <div className="help">notes in the tree</div>
        </Stat>
        <Stat span={3} label="State root" accent="violet">
          {showPoolSk ? (
            <Sk w={130} h={16} r={6} />
          ) : (
            <span className="mono" style={{ fontSize: 13, wordBreak: "break-all", color: "var(--violet)" }}>
              {pool ? short(pool.root, 7) : "—"}
            </span>
          )}
          <div className="help">live · Merkle commitment</div>
        </Stat>
      </div>

      <div className="app-tile" style={{ padding: 0, overflow: "hidden" }}>
        <div className="between pos-row" style={{ padding: "18px 22px" }}>
          <div className="row">
            <strong style={{ fontSize: 15 }}>Positions</strong>
            <span className="eyebrow">amounts shielded by default</span>
          </div>
          <div className="row">
            <Link className="btn ghost" href="/app/disclosure">
              Disclose
            </Link>
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
              <div className="help">{wallet ? "Shield an asset to begin." : "Connect a testnet key (top right), then shield."}</div>
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

      <div style={{ marginTop: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Network activity</div>
        <ActivityStream max={6} />
      </div>

      {poolError && (
        <div className="app-tile" style={{ marginTop: 16, borderColor: "rgba(239,111,111,0.3)" }}>
          <div className="row">
            <span className="badge red">chain</span>
            <span className="dim" style={{ fontSize: 13 }}>Couldn’t read the pool: {poolError}</span>
          </div>
        </div>
      )}

      {shieldOpen && wallet && (
        <ShieldDialog wallet={wallet} onClose={() => setShieldOpen(false)} onDone={(msg) => { setShieldOpen(false); onSettled(msg); }} />
      )}
      {withdrawNote && wallet && (
        <WithdrawDialog wallet={wallet} note={withdrawNote} onClose={() => setWithdrawNote(null)} onDone={(msg) => { setWithdrawNote(null); onSettled(msg); }} />
      )}

      {toast && (
        <div className="toast">
          <span className={`badge ${toast.kind === "ok" ? "green" : "red"}`}>{toast.kind === "ok" ? "done" : "error"}</span>
          <span style={{ fontSize: 13 }}>{toast.msg}</span>
        </div>
      )}
    </>
  );
}

function Stat({ label, span, accent, children }: { label: string; span: number; accent?: "cyan" | "violet" | "amber"; children: React.ReactNode }) {
  return (
    <div className="app-tile mob-half" style={{ gridColumn: `span ${span}`, minWidth: 0 }}>
      <div className="eyebrow" style={{ marginBottom: 12 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
      {accent && <span style={{ position: "absolute", top: 16, right: 16, width: 6, height: 6, borderRadius: 999, background: `var(--${accent})`, boxShadow: `0 0 8px var(--${accent})` }} />}
    </div>
  );
}

function PositionRow({ note, revealed, onToggle, onSettle }: { note: StoredNote; revealed: boolean; onToggle: () => void; onSettle: () => void }) {
  const initial = note.scope.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "NR";
  return (
    <div className="between pos-row" style={{ padding: "16px 22px", borderTop: "1px solid var(--line)" }}>
      <div className="row" style={{ gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--amber-dim)", color: "var(--amber)", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 13 }}>
          {initial}
        </div>
        <div>
          <div style={{ fontSize: 14.5 }}>{note.scope}</div>
          <div className="eyebrow">shielded note · {ASSET.symbol}</div>
        </div>
      </div>
      <div className="row pos-row-actions" style={{ gap: 28 }}>
        <div style={{ textAlign: "right", minWidth: 150 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>balance</div>
          {revealed ? (
            <span className="revealed" style={{ fontSize: 15 }}>{formatAmount(BigInt(note.value))} {ASSET.symbol}</span>
          ) : (
            <button className="shielded" onClick={onToggle} title="reveal (deliberate act)">shielded ●●●●</button>
          )}
        </div>
        <div className="row">
          {revealed && <button className="btn ghost" onClick={onToggle}>Hide</button>}
          <button className="btn" onClick={onSettle}>Settle →</button>
        </div>
      </div>
    </div>
  );
}
