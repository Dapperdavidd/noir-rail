// Skeleton fallback for the /app segment (and any sub-page without its own).
// Next renders this in a Suspense boundary while the route's code + data stream
// in — so a visitor sees the page's shape (a "blank slate") instead of an empty
// screen, then real content fills it. Pure markup; the shimmer is CSS (.sk).
export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      {/* page header: eyebrow · title · description */}
      <div className="app-pagehead">
        <span className="sk sk-line" style={{ width: 90, height: 10, marginBottom: 14 }} />
        <span className="sk" style={{ width: 260, height: 30, borderRadius: 8 }} />
        <span className="sk sk-line" style={{ width: "min(560px, 80%)", marginTop: 16 }} />
      </div>

      {/* stat row — four span-3 tiles */}
      <div className="app-grid" style={{ marginBottom: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="app-tile sk-tile" style={{ gridColumn: "span 3", minWidth: 0 }}>
            <span className="sk sk-line" style={{ width: 96, height: 9, marginBottom: 16 }} />
            <span className="sk" style={{ width: 120, height: 26, borderRadius: 7 }} />
            <span className="sk sk-line" style={{ width: 70, height: 8, marginTop: 14 }} />
          </div>
        ))}
      </div>

      {/* content split — 7 / 5 */}
      <div className="app-grid">
        <div className="app-tile" style={{ gridColumn: "span 7" }}>
          <span className="sk sk-line" style={{ width: 140, height: 12, marginBottom: 18 }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="sk sk-line"
              style={{ width: `${92 - i * 8}%`, height: 14, marginTop: 12 }}
            />
          ))}
        </div>
        <div className="app-tile" style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="sk sk-line" style={{ width: 110, height: 12, marginBottom: 6 }} />
          {[0, 1, 2].map((i) => (
            <span key={i} className="sk" style={{ width: "100%", height: 52, borderRadius: 10 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
