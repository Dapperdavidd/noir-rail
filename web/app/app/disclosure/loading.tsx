import { Sk, SkPageHead } from "@/components/app/Skeleton.tsx";

// Disclosure page skeleton: header → three layer tiles → wide dashed console placeholder.
export default function DisclosureLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <SkPageHead />

      <div className="app-grid">
        {[0, 1, 2].map((i) => (
          <div key={i} className="app-tile" style={{ gridColumn: "span 4" }}>
            <Sk w={24} h={10} />
            <Sk w={140} h={16} r={6} style={{ marginTop: 14 }} />
            {[0, 1, 2, 3].map((j) => (
              <Sk key={j} w={`${94 - j * 9}%`} h={10} style={{ marginTop: j ? 9 : 14 }} />
            ))}
          </div>
        ))}
      </div>

      <div className="app-tile" style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 36, borderStyle: "dashed" }}>
        <Sk w={28} h={28} r={999} />
        <Sk w={260} h={12} />
        <Sk w={320} h={9} />
      </div>
    </div>
  );
}
