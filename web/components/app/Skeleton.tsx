import type { CSSProperties } from "react";

/** A single shimmering placeholder block. Used both by route-level loading.tsx
 *  skeletons and inline in client pages while on-chain data streams in. The
 *  shimmer + reduced-motion handling live in globals.css under `.sk`. */
export function Sk({
  w = "100%",
  h = 12,
  r = 5,
  style,
}: {
  w?: number | string;
  h?: number;
  r?: number;
  style?: CSSProperties;
}) {
  return <span className="sk" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />;
}

/** Page header placeholder: eyebrow · title · description — mirrors <PageHead />. */
export function SkPageHead() {
  return (
    <div className="app-pagehead">
      <Sk w={88} h={10} style={{ marginBottom: 14 }} />
      <Sk w={240} h={30} r={8} />
      <Sk w="min(560px, 80%)" h={12} style={{ marginTop: 16 }} />
    </div>
  );
}

/** A stat-card placeholder (label · big value · subtext) inside .app-tile. */
export function SkStatTile({ span = 3 }: { span?: number }) {
  return (
    <div className="app-tile sk-tile" style={{ gridColumn: `span ${span}`, minWidth: 0 }}>
      <Sk w={96} h={9} style={{ marginBottom: 16 }} />
      <Sk w={120} h={26} r={7} />
      <Sk w={70} h={8} style={{ marginTop: 14 }} />
    </div>
  );
}
