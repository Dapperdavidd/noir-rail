import Link from "next/link";
import { notFound } from "next/navigation";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";
import { CHAPTERS } from "@/lib/chapters.ts";

export function generateStaticParams() {
  return CHAPTERS.map((c) => ({ slug: c.slug }));
}

export default async function DocChapter({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const idx = CHAPTERS.findIndex((c) => c.slug === slug);
  if (idx < 0) notFound();
  const chapter = CHAPTERS[idx];

  let raw: string;
  try {
    raw = readFileSync(join(process.cwd(), "..", "docs", "book", `${slug}.md`), "utf8");
  } catch {
    notFound();
  }

  // Rewrite the book's relative .md links to in-app doc routes.
  let html = await marked.parse(raw);
  html = html
    .replace(/href="(?:\.\/)?README\.md"/g, 'href="/app/docs"')
    .replace(/href="(?:\.\/)?([0-9A-Za-z-]+)\.md"/g, 'href="/app/docs/$1"');

  const prev = CHAPTERS[idx - 1];
  const next = CHAPTERS[idx + 1];

  return (
    <>
      <div className="row" style={{ gap: 10, marginBottom: 18 }}>
        <Link href="/app/docs" className="eyebrow" style={{ color: "var(--amber)" }}>← Documentation</Link>
        <span className="eyebrow" style={{ color: "var(--ink-4)" }}>· {chapter.part}</span>
      </div>

      <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />

      <nav className="between" style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--line)", gap: 12 }}>
        {prev ? (
          <Link href={`/app/docs/${prev.slug}`} className="app-tile" style={{ flex: 1, textDecoration: "none" }}>
            <div className="eyebrow">← Previous</div>
            <div style={{ color: "var(--ink)", marginTop: 6, fontSize: 14 }}>{prev.title}</div>
          </Link>
        ) : <div style={{ flex: 1 }} />}
        {next ? (
          <Link href={`/app/docs/${next.slug}`} className="app-tile" style={{ flex: 1, textAlign: "right", textDecoration: "none" }}>
            <div className="eyebrow">Next →</div>
            <div style={{ color: "var(--ink)", marginTop: 6, fontSize: 14 }}>{next.title}</div>
          </Link>
        ) : <div style={{ flex: 1 }} />}
      </nav>
    </>
  );
}
