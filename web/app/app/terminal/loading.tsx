import { Sk, SkPageHead, SkStatTile } from "@/components/app/Skeleton.tsx";

// Terminal page skeleton: header → four stat tiles → positions table → activity.
export default function TerminalLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <SkPageHead />

      <div className="app-grid" style={{ marginBottom: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <SkStatTile key={i} />
        ))}
      </div>

      {/* positions table */}
      <div className="app-tile" style={{ padding: 0, overflow: "hidden" }}>
        <div className="between" style={{ padding: "18px 22px" }}>
          <Sk w={120} h={14} />
          <div className="row" style={{ gap: 10 }}>
            <Sk w={84} h={32} r={9} />
            <Sk w={110} h={32} r={9} />
          </div>
        </div>
        <hr className="hairline" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="between" style={{ padding: "16px 22px", borderTop: "1px solid var(--line)" }}>
            <div className="row" style={{ gap: 14 }}>
              <Sk w={36} h={36} r={9} />
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <Sk w={120} h={12} />
                <Sk w={80} h={8} />
              </div>
            </div>
            <Sk w={120} h={30} r={8} />
          </div>
        ))}
      </div>

      {/* activity */}
      <div style={{ marginTop: 16 }}>
        <Sk w={120} h={10} style={{ marginBottom: 12 }} />
        <div className="app-tile">
          {[0, 1, 2, 3].map((i) => (
            <Sk key={i} w={`${88 - i * 6}%`} h={13} style={{ marginTop: i ? 14 : 0 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
