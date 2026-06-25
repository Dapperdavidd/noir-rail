import { Sk, SkPageHead } from "@/components/app/Skeleton.tsx";

// Docs index skeleton: header → grouped sections of two-column chapter cards.
export default function DocsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <SkPageHead />

      {[0, 1].map((section) => (
        <section key={section} style={{ marginBottom: 28 }}>
          <Sk w={120} h={9} style={{ marginBottom: 14 }} />
          <div className="app-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="app-tile" style={{ gridColumn: "span 6" }}>
                <div className="row" style={{ gap: 12, alignItems: "baseline" }}>
                  <Sk w={20} h={11} />
                  <Sk w={`${50 + (i % 3) * 12}%`} h={14} />
                </div>
                <Sk w="92%" h={10} style={{ marginTop: 12 }} />
                <Sk w="78%" h={10} style={{ marginTop: 8 }} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
