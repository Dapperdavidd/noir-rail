import { Sk, SkPageHead, SkStatTile } from "@/components/app/Skeleton.tsx";

// Skeleton for the Overview/Control-room page (and default fallback for any app
// sub-page without its own loading.tsx). Mirrors its layout: header → four stat
// tiles → a 7/5 split (activity stream · quick actions).
export default function OverviewLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <SkPageHead />

      <div className="app-grid" style={{ marginBottom: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <SkStatTile key={i} />
        ))}
      </div>

      <div className="app-grid">
        <div className="app-tile" style={{ gridColumn: "span 7" }}>
          <Sk w={140} h={12} style={{ marginBottom: 18 }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Sk key={i} w={`${92 - i * 8}%`} h={14} style={{ marginTop: 12 }} />
          ))}
        </div>
        <div className="app-tile" style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: 12 }}>
          <Sk w={110} h={12} style={{ marginBottom: 6 }} />
          {[0, 1, 2].map((i) => (
            <Sk key={i} h={52} r={10} />
          ))}
        </div>
      </div>
    </div>
  );
}
