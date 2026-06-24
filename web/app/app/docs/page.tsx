import Link from "next/link";
import { CHAPTERS } from "@/lib/chapters.ts";

export default function DocsIndex() {
  const parts = [...new Set(CHAPTERS.map((c) => c.part))];
  return (
    <>
      <div className="app-pagehead">
        <h1>Documentation</h1>
        <p>
          The NoirRail book — a guided, build-it-yourself tour of the whole system, from the
          thesis to the circuits, the contract, and the client. Read it in order.
        </p>
      </div>

      {parts.map((part) => (
        <section key={part} style={{ marginBottom: 28 }}>
          <div className="app-navlabel" style={{ padding: "0 0 10px" }}>{part}</div>
          <div className="app-grid">
            {CHAPTERS.filter((c) => c.part === part).map((c) => (
              <Link
                key={c.slug}
                href={`/app/docs/${c.slug}`}
                className="app-tile"
                style={{ gridColumn: "span 6", display: "block" }}
              >
                <div className="row" style={{ gap: 12, alignItems: "baseline" }}>
                  <span className="num" style={{ color: "var(--amber)", fontSize: 13 }}>{c.n}</span>
                  <strong style={{ fontSize: 15.5, color: "var(--ink)" }}>{c.title}</strong>
                </div>
                <p className="help" style={{ marginTop: 8 }}>{c.blurb}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
