import { Sk } from "@/components/app/Skeleton.tsx";

// Doc chapter skeleton: back link → prose body → prev/next nav. This page reads a
// markdown file on the server, so the boundary genuinely shows during that read.
export default function DocChapterLoading() {
  // Varied line widths so the body reads as paragraphs, not a solid block.
  const widths = ["96%", "88%", "92%", "70%", "0", "94%", "85%", "90%", "60%", "0", "93%", "80%"];
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="row" style={{ gap: 10, marginBottom: 18 }}>
        <Sk w={120} h={10} />
        <Sk w={90} h={10} />
      </div>

      <div style={{ maxWidth: "76ch" }}>
        <Sk w="60%" h={28} r={8} style={{ marginBottom: 22 }} />
        {widths.map((w, i) =>
          w === "0" ? <div key={i} style={{ height: 14 }} /> : <Sk key={i} w={w} h={13} style={{ marginTop: 10 }} />,
        )}
      </div>

      <div className="between" style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--line)", gap: 12 }}>
        {[0, 1].map((i) => (
          <div key={i} className="app-tile" style={{ flex: 1 }}>
            <Sk w={70} h={9} />
            <Sk w="60%" h={12} style={{ marginTop: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
