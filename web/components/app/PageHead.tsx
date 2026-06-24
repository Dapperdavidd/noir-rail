import type { ReactNode } from "react";

/** Consistent-but-distinct page header: a section eyebrow (accent-colored) + title + description.
 *  The per-section accent gives each page its own identity inside the shared shell. */
export function PageHead({
  eyebrow,
  title,
  desc,
  accent = "amber",
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  desc: string;
  accent?: "amber" | "cyan" | "violet" | "green" | "ink";
  action?: ReactNode;
}) {
  return (
    <div className="app-pagehead">
      <div className="between" style={{ alignItems: "flex-end", gap: 16 }}>
        <div>
          <div className="app-eyebrow" style={{ color: accent === "ink" ? "var(--ink-3)" : `var(--${accent})` }}>
            {eyebrow}
          </div>
          <h1>{title}</h1>
        </div>
        {action}
      </div>
      <p>{desc}</p>
    </div>
  );
}
