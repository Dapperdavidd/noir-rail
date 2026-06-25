import { Sk, SkPageHead } from "@/components/app/Skeleton.tsx";

// Assets page skeleton: header → 6/6 split (live pool card · onboarding placeholder).
export default function AssetsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <SkPageHead />

      <div className="app-grid">
        <div className="app-tile" style={{ gridColumn: "span 6" }}>
          <div className="row" style={{ gap: 12, marginBottom: 14 }}>
            <Sk w={40} h={40} r={10} />
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <Sk w={90} h={13} />
              <Sk w={140} h={8} />
            </div>
            <Sk w={64} h={22} r={999} style={{ marginLeft: "auto" }} />
          </div>
          <div className="app-grid" style={{ gap: 12 }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ gridColumn: "span 6", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
                <Sk w={80} h={9} style={{ marginBottom: 10 }} />
                <Sk w={100} h={22} r={7} />
              </div>
            ))}
          </div>
          <Sk h={42} r={10} style={{ marginTop: 16 }} />
        </div>

        <div
          className="app-tile"
          style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 10, borderStyle: "dashed" }}
        >
          <Sk w={28} h={28} r={999} />
          <Sk w={200} h={12} />
          <Sk w={260} h={9} />
        </div>
      </div>
    </div>
  );
}
