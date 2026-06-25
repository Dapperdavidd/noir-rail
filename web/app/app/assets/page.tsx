"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ASSET, formatAmount } from "@/lib/config.ts";
import { fetchPoolState, type PoolState } from "@/lib/stellar.ts";
import { PageHead } from "@/components/app/PageHead.tsx";
import { Sk } from "@/components/app/Skeleton.tsx";

export default function Assets() {
  const [pool, setPool] = useState<PoolState | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchPoolState("").then(setPool).catch(() => setPool(null)).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHead
        eyebrow="Pools"
        accent="violet"
        title="Assets"
        desc="Each tokenized asset gets its own shielded pool — one Merkle tree, one nullifier set, one Stellar Asset Contract in custody. Phase 0 runs a single live pool; the registry scales to many in Phase 3."
      />

      <div className="app-grid">
        <div className="app-tile" style={{ gridColumn: "span 6" }}>
          <div className="row" style={{ gap: 12, marginBottom: 14 }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--amber-dim)", color: "var(--amber)", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
              {ASSET.symbol.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <div style={{ fontSize: 15, color: "var(--ink)" }}>{ASSET.symbol}</div>
              <div className="eyebrow">live shielded pool · testnet</div>
            </div>
            <span className="badge cyan" style={{ marginLeft: "auto" }}>Active</span>
          </div>
          <div className="app-grid" style={{ gap: 12 }}>
            <Mini span={6} k="Pool TVL" v={pool ? `${formatAmount(pool.balance)}` : "—"} loading={loading} />
            <Mini span={6} k="Commitments" v={pool ? String(pool.commitmentCount) : "—"} loading={loading} />
          </div>
          <Link href="/app/terminal" className="btn primary" style={{ marginTop: 16, width: "100%" }}>
            Open in terminal →
          </Link>
        </div>

        <div className="app-tile" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", borderStyle: "dashed", color: "var(--ink-3)" }}>
          <div className="diamond" style={{ fontSize: 26 }}>◇</div>
          <div style={{ color: "var(--ink-2)", marginTop: 10 }}>More assets onboarding in Phase 3</div>
          <div className="help" style={{ marginTop: 4, maxWidth: "34ch" }}>
            Treasuries, invoices, and private credit — each an isolated pool, registered with its
            issuer and pinned verification keys.
          </div>
        </div>
      </div>
    </>
  );
}

function Mini({ k, v, span, loading }: { k: string; v: string; span: number; loading?: boolean }) {
  return (
    <div className="mob-half" style={{ gridColumn: `span ${span}`, border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{k}</div>
      {loading ? (
        <Sk w={90} h={22} r={6} />
      ) : (
        <div className="num" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{v}</div>
      )}
    </div>
  );
}
