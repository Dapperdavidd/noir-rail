"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useWallet } from "./wallet-context.tsx";

const short = (s: string, n = 4) => (s.length > 2 * n ? `${s.slice(0, n)}…${s.slice(-n)}` : s);

type Item = { href: string; label: string; icon: keyof typeof ICONS; soon?: boolean };
const SECTIONS: { label?: string; items: Item[] }[] = [
  { items: [{ href: "/app", label: "Overview", icon: "grid" }] },
  {
    label: "Settle",
    items: [
      { href: "/app/terminal", label: "Terminal", icon: "terminal" },
      { href: "/app/activity", label: "Activity", icon: "activity" },
      { href: "/app/assets", label: "Assets", icon: "layers" },
    ],
  },
  { label: "Audit", items: [{ href: "/app/disclosure", label: "Disclosure", icon: "eye" }] },
  { label: "Learn", items: [{ href: "/app/docs", label: "Documentation", icon: "book" }] },
  { items: [{ href: "/app/settings", label: "Settings", icon: "gear" }] },
];

const ALL = SECTIONS.flatMap((s) => s.items);

// Mobile bottom-nav split: four primary tabs + a "More" sheet for the rest.
const PRIMARY: Item[] = [
  { href: "/app", label: "Overview", icon: "grid" },
  { href: "/app/terminal", label: "Terminal", icon: "terminal" },
  { href: "/app/activity", label: "Activity", icon: "activity" },
  { href: "/app/assets", label: "Assets", icon: "layers" },
];
const MORE: Item[] = [
  { href: "/app/docs", label: "Documentation", icon: "book" },
  { href: "/app/disclosure", label: "Disclosure", icon: "eye" },
  { href: "/app/settings", label: "Settings", icon: "gear" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
  const current = [...ALL].reverse().find((i) => isActive(i.href));
  const moreActive = MORE.some((i) => isActive(i.href));

  const [collapsed, setCollapsed] = useState(false);
  const [peek, setPeek] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    setCollapsed(localStorage.getItem("nr.sidebar") === "collapsed");
  }, []);
  // Close the mobile sheet whenever the route changes.
  useEffect(() => setMoreOpen(false), [pathname]);

  const toggle = () =>
    setCollapsed((c) => {
      const n = !c;
      localStorage.setItem("nr.sidebar", n ? "collapsed" : "open");
      setPeek(false);
      return n;
    });

  return (
    <div className={`app-root ${collapsed ? "collapsed" : ""}`}>
      {/* Arc-style: when collapsed, a thin left-edge zone slides the sidebar in on hover. */}
      {collapsed && <div className="app-edge" onMouseEnter={() => setPeek(true)} aria-hidden />}

      <aside
        className={`app-sidebar ${collapsed && peek ? "peeking" : ""}`}
        onMouseLeave={() => collapsed && setPeek(false)}
      >
        <div className="between" style={{ alignItems: "flex-start" }}>
          <Link href="/" className="app-brand" aria-label="NoirRail home">
            <span className="mark">N</span>
            <span className="wm">Noir<em>Rail</em></span>
          </Link>
          <button className="app-iconbtn" style={{ marginTop: 2 }} onClick={toggle} aria-label="Collapse sidebar" title="Collapse sidebar">
            <PanelIcon />
          </button>
        </div>

        {SECTIONS.map((sec, i) => (
          <div key={i}>
            {sec.label && <div className="app-navlabel">{sec.label}</div>}
            {sec.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setPeek(false)}
                className={`app-nav ${isActive(it.href) ? "active" : ""}`}
              >
                <Icon name={it.icon} />
                {it.label}
                {it.soon && <span className="soon">Phase 2</span>}
              </Link>
            ))}
          </div>
        ))}

        <div className="app-side-foot">
          <div className="app-netpill"><i /> Stellar · Testnet</div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="row" style={{ gap: 12, minWidth: 0 }}>
            {collapsed && (
              <button className="app-iconbtn" onClick={toggle} aria-label="Pin sidebar" title="Pin sidebar">
                <PanelIcon />
              </button>
            )}
            {/* Mobile-only brand so the bar reads as a product, not an empty strip. */}
            <Link href="/" className="app-topbrand" aria-label="NoirRail home">
              <span className="mark">N</span>
              <span className="wm">Noir<em>Rail</em></span>
            </Link>
            <div className="app-crumb">NoirRail <span style={{ opacity: 0.4 }}>/</span> <b>{current?.label ?? "App"}</b></div>
          </div>
          <WalletButton />
        </header>

        <div className="app-content">{children}</div>
      </div>

      {/* Mobile bottom navigation — primary tabs + a slide-up "More" sheet. */}
      <nav className="app-bottomnav" aria-label="Primary">
        {PRIMARY.map((it) => (
          <Link key={it.href} href={it.href} className={`app-bottomtab ${isActive(it.href) ? "active" : ""}`}>
            <Icon name={it.icon} />
            <span>{it.label}</span>
          </Link>
        ))}
        <button
          className={`app-bottomtab ${moreActive || moreOpen ? "active" : ""}`}
          onClick={() => setMoreOpen((o) => !o)}
          aria-label="More sections"
          aria-expanded={moreOpen}
        >
          <MoreIcon />
          <span>More</span>
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="app-sheet-backdrop"
              onClick={() => setMoreOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              aria-hidden
            />
            <motion.div
              className="app-sheet"
              role="dialog"
              aria-label="More sections"
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              exit={{ y: "110%" }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="app-sheet-grip" aria-hidden />
              {MORE.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`app-sheet-link ${isActive(it.href) ? "active" : ""}`}
                  onClick={() => setMoreOpen(false)}
                >
                  <span className="ico"><Icon name={it.icon} /></span>
                  {it.label}
                  {it.soon && <span className="soon">Phase 2</span>}
                  <span className="chev" aria-hidden>›</span>
                </Link>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function PanelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WalletButton() {
  const { wallet, busy, connect, disconnect } = useWallet();
  if (wallet) {
    return (
      <div className="row" style={{ gap: 10 }}>
        <span className="app-netpill" style={{ padding: "6px 10px" }}>
          <i style={{ background: "var(--amber)", boxShadow: "0 0 8px var(--amber)" }} />
          {short(wallet.publicKey(), 5)}
        </span>
        <button className="btn ghost" onClick={disconnect}>Disconnect</button>
      </div>
    );
  }
  return (
    <button className={`btn ${busy ? "loading" : "primary"}`} onClick={connect} disabled={busy}>
      {busy ? <span className="spinner" /> : null}
      {busy ? "Funding…" : <>Connect<span className="wallet-extra">&nbsp;testnet key</span></>}
    </button>
  );
}

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

const ICONS = {
  grid: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  terminal: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3" /><path d="M13 15h4" /></>),
  activity: (<path d="M3 12h4l2.5-7 5 14L17 12h4" />),
  layers: (<><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>),
  eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>),
  book: (<><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" /><path d="M19 17H6" /></>),
  gear: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 6.7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4 12.6 1.6 1.6 0 0 0 2.9 11H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 5.3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 2.9V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.4Z" /></>),
} as const;
