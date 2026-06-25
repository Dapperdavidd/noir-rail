import { Sk, SkPageHead } from "@/components/app/Skeleton.tsx";

// Settings page skeleton: header → 7/5 split (wallet · network) → danger zone.
function SkFields({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="between" style={{ padding: "10px 0", borderBottom: "1px solid var(--line)", gap: 16 }}>
          <Sk w={120} h={10} />
          <Sk w={`${30 + (i % 3) * 12}%`} h={10} />
        </div>
      ))}
    </>
  );
}

export default function SettingsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <SkPageHead />

      <div className="app-grid">
        <div className="app-tile" style={{ gridColumn: "span 7" }}>
          <Sk w={70} h={10} style={{ marginBottom: 14 }} />
          <SkFields rows={2} />
          <Sk w={130} h={34} r={9} style={{ marginTop: 16 }} />
        </div>
        <div className="app-tile" style={{ gridColumn: "span 5" }}>
          <Sk w={80} h={10} style={{ marginBottom: 14 }} />
          <SkFields rows={4} />
        </div>
      </div>

      <div className="app-tile" style={{ marginTop: 16 }}>
        <Sk w={100} h={10} style={{ marginBottom: 14 }} />
        <div className="between" style={{ gap: 16 }}>
          <Sk w="60%" h={10} />
          <Sk w={140} h={34} r={9} />
        </div>
      </div>
    </div>
  );
}
