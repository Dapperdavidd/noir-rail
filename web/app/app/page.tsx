"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ASSET, POOL_ID, formatAmount } from "@/lib/config.ts";
import { fetchPoolState, type PoolState } from "@/lib/stellar.ts";
import { loadNotes, type StoredNote } from "@/lib/notes.ts";
import { ActivityStream } from "@/components/ActivityStream.tsx";
import { useWallet } from "@/components/app/wallet-context.tsx";
import { PageHead } from "@/components/app/PageHead.tsx";
import { Sk } from "@/components/app/Skeleton.tsx";

const short = (s: string, n = 6) => (s.length > 2 * n ? `${s.slice(0, n)}…${s.slice(-n)}` : s);

export default function Overview() {
  const { wallet } = useWallet();
  const [pool, setPool] = useState<PoolState | null>(null);
  const [poolLoading, setPoolLoading] = useState(true);
  const [notes, setNotes] = useState<StoredNote[]>([]);

  useEffect(() => {
    setNotes(loadNotes());
    setPoolLoading(true);
    fetchPoolState(wallet?.publicKey() ?? "")
      .then(setPool)
      .catch(() => setPool(null))
      .finally(() => setPoolLoading(false));
  }, [wallet]);

  const live = notes.filter((n) => !n.spent);
  const held = live.reduce((s, n) => s + BigInt(n.value), 0n);

  return (
    <>
      <PageHead
        eyebrow="Dashboard"
        accent="amber"
        title="Control room"
        desc="Live state of your shielded pool on Stellar testnet. Amounts are sealed by default — settlement happens in the terminal; everything here updates as the chain does."
      />

      <div className="app-grid" style={{ marginBottom: 16 }}>
        <Tile span={3} label="Total value · shielded" accent="cyan">
          {wallet ? (
            <span className="shielded" style={{ fontSize: 15 }}>view ●●●●</span>
          ) : poolLoading ? (
            <Sk w={120} h={26} r={7} />
          ) : (
            <span className="num stat-value">{pool ? formatAmount(pool.balance) : "—"}</span>
          )}
          <div className="help">{wallet ? "visible only with your key" : "pool TVL"}</div>
        </Tile>
        <Tile span={3} label="Your positions">
          <span className="num stat-value">{live.length}</span>
          <div className="help">{live.length ? `${formatAmount(held)} ${ASSET.symbol} held` : "none yet"}</div>
        </Tile>
        <Tile span={3} label="Pool commitments" accent="amber">
          {poolLoading ? (
            <Sk w={80} h={26} r={7} />
          ) : (
            <span className="num stat-value amber">{pool ? pool.commitmentCount : "—"}</span>
          )}
          <div className="help">notes in the tree</div>
        </Tile>
        <Tile span={3} label="State root" accent="violet">
          {poolLoading ? (
            <Sk w={130} h={16} r={6} />
          ) : (
            <span className="mono" style={{ fontSize: 13, color: "var(--violet)", wordBreak: "break-all" }}>
              {pool ? short(pool.root, 7) : "—"}
            </span>
          )}
          <div className="help">live · Merkle root</div>
        </Tile>
      </div>

      <div className="app-grid">
        <div className="app-tile" style={{ gridColumn: "span 7" }}>
          <div className="between" style={{ marginBottom: 14 }}>
            <strong style={{ fontSize: 14 }}>Network activity</strong>
            <Link href="/app/activity" className="eyebrow" style={{ color: "var(--amber)" }}>View all →</Link>
          </div>
          <ActivityStream max={6} />
        </div>

        <div className="app-tile" style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: 10 }}>
          <strong style={{ fontSize: 14, marginBottom: 4 }}>Quick actions</strong>
          <QuickAction href="/app/terminal" title="Open the terminal" sub="Shield, transfer, unshield" primary />
          <QuickAction href="/app/assets" title="Browse assets" sub="Per-asset shielded pools" />
          <QuickAction href="/app/docs" title="Read the docs" sub="The 13-chapter book, in-app" />
          {!wallet && (
            <div className="card-tight" style={{ borderRadius: 10, border: "1px solid var(--line)", marginTop: 4 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Get started</div>
              <div className="help" style={{ marginTop: 0 }}>Connect a testnet key (top right) to shield your first position.</div>
            </div>
          )}
        </div>
      </div>

      <footer className="between" style={{ marginTop: 24, color: "var(--ink-4)", fontSize: 11 }}>
        <span className="eyebrow">NoirRail · Obsidian Clearing</span>
        <span className="mono">{short(POOL_ID, 6)} · testnet</span>
      </footer>
    </>
  );
}

function Tile({ label, span, accent, children }: { label: string; span: number; accent?: "cyan" | "violet" | "amber"; children: React.ReactNode }) {
  return (
    <div className="app-tile" style={{ gridColumn: `span ${span}`, minWidth: 0 }}>
      <div className="eyebrow" style={{ marginBottom: 12 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
      {accent && <span style={{ position: "absolute", top: 16, right: 16, width: 6, height: 6, borderRadius: 999, background: `var(--${accent})`, boxShadow: `0 0 8px var(--${accent})` }} />}
    </div>
  );
}

function QuickAction({ href, title, sub, primary }: { href: string; title: string; sub: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className="between"
      style={{
        padding: "13px 15px",
        borderRadius: 10,
        border: `1px solid ${primary ? "rgba(231,178,92,0.3)" : "var(--line)"}`,
        background: primary ? "rgba(231,178,92,0.06)" : "rgba(255,255,255,0.015)",
      }}
    >
      <div>
        <div style={{ fontSize: 14, color: "var(--ink)" }}>{title}</div>
        <div className="help" style={{ marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ color: primary ? "var(--amber)" : "var(--ink-3)" }}>→</span>
    </Link>
  );
}
