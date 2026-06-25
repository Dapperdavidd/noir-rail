import { Sk, SkPageHead } from "@/components/app/Skeleton.tsx";

// Activity page skeleton: header → three context tiles → 8/4 split (stream · legend).
export default function ActivityLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <SkPageHead />

      <div className="app-grid" style={{ marginBottom: 16 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="app-tile sk-tile" style={{ gridColumn: "span 4" }}>
            <Sk w={80} h={9} style={{ marginBottom: 14 }} />
            <Sk w={120} h={22} r={7} />
            <Sk w={100} h={8} style={{ marginTop: 12 }} />
          </div>
        ))}
      </div>

      <div className="app-grid">
        <div className="app-tile" style={{ gridColumn: "span 8" }}>
          <Sk w={150} h={10} style={{ marginBottom: 16 }} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="row" style={{ gap: 12, padding: "10px 0" }}>
              <Sk w={6} h={6} r={999} />
              <Sk w={48} h={9} />
              <Sk w={`${60 - i * 5}%`} h={12} />
            </div>
          ))}
        </div>
        <div className="app-tile" style={{ gridColumn: "span 4" }}>
          <Sk w={130} h={10} style={{ marginBottom: 16 }} />
          {[0, 1, 2].map((i) => (
            <div key={i} className="row" style={{ alignItems: "flex-start", gap: 10, marginTop: i ? 14 : 0 }}>
              <Sk w={8} h={8} r={999} style={{ marginTop: 4 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <Sk w={70} h={11} />
                <Sk w="90%" h={9} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
