"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal, Magnetic, Parallax, Counter } from "@/components/landing/ui.tsx";
import { MobileCarousel } from "@/components/landing/MobileCarousel.tsx";
import { TerminalMock } from "@/components/landing/TerminalMock.tsx";
import { LivingBackground } from "@/components/landing/LivingBackground.tsx";
import ColorBends from "@/components/landing/ColorBends";

export default function Landing() {
  // Torchlight: one delegated listener writes the cursor position into the hovered card's
  // CSS vars (--mx/--my), so the .torch glow follows the cursor across every card-like surface.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(".torch") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Always open at the top, and make in-page links smooth-scroll WITHOUT writing a #hash to the
  // URL — so a reload never lands mid-page (e.g. on the architecture section).
  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.scrollTo(0, 0);

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      e.preventDefault();
      const href = a.getAttribute("href") || "";
      if (href === "#" || href === "#top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <main className="lp">
      <Background />
      <Nav />
      <Hero />
      <Anchors />
      <Stats />
      <Features />
      <SettlementPath />
      <Security />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}

/* ----------------------------------------------------------------- atmosphere */

function Background() {
  return (
    <>
      {/* Deepest layer: ColorBends WebGL bends, in the Obsidian Clearing palette, kept restrained
          so it reads as atmosphere beneath the living rails — not a crypto-site gradient. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -2,
          pointerEvents: "none",
          opacity: 0.55,
          maskImage: "linear-gradient(180deg, #000 0%, #000 62%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, #000 0%, #000 62%, transparent 100%)",
        }}
      >
        {/* One calm gold ribbon — bright highlights, dark troughs — for the "less is more" feel. */}
        <ColorBends
          colors={["#f0d39a", "#e7b25c", "#c0940c", "#4a3506"]}
          rotation={90}
          autoRotate={1}
          speed={0.16}
          scale={1.25}
          frequency={1}
          warpStrength={1}
          mouseInfluence={0.7}
          parallax={0.5}
          noise={0}
          iterations={2}
          intensity={1.25}
          bandWidth={7}
          transparent
        />
      </div>
      {/* The living rails are kept to a faint texture so the gold ribbon and the copy lead. */}
      <div aria-hidden style={{ opacity: 0.18 }}>
        <LivingBackground />
      </div>
      <div className="lp-grain" />
    </>
  );
}

/* ------------------------------------------------------------------------ nav */

const NAV_LINKS: [string, string][] = [
  ["Product", "#features"],
  ["How it works", "#how"],
  ["Security", "#security"],
  ["FAQ", "#faq"],
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open; close it on Escape.
  useEffect(() => {
    document.body.classList.toggle("nav-open", menuOpen);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("nav-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <nav className={`lp-nav ${scrolled ? "scrolled" : ""}`}>
      <div className="lp-container">
        <div className="lp-nav-inner">
          <a
            href="/"
            className="lp-wordmark"
            onClick={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-label="NoirRail — back to top"
          >
            Noir<em>Rail</em>
          </a>
          <div className="lp-navlinks">
            {NAV_LINKS.map(([label, href]) => (
              <a key={href} className="lp-navlink" href={href}>{label}</a>
            ))}
          </div>
          <div className="lp-nav-right">
            <Magnetic strength={0.35}>
              <Link href="/app" className="lp-cta primary" style={{ height: 40, padding: "0 16px" }}>
                Launch <span className="arrow">→</span>
              </Link>
            </Magnetic>
            <button
              className="lp-burger"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <BurgerIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="lp-mobnav-backdrop"
              onClick={() => setMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              aria-hidden
            />
            <motion.div
              className="lp-mobnav"
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              {NAV_LINKS.map(([label, href], i) => (
                <motion.a
                  key={href}
                  href={href}
                  className="lp-mobnav-link"
                  onClick={() => setMenuOpen(false)}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 + i * 0.04, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  {label} <span className="arrow">→</span>
                </motion.a>
              ))}
              <Link href="/app" className="lp-cta primary lp-mobnav-cta" onClick={() => setMenuOpen(false)}>
                Launch the app <span className="arrow">→</span>
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </>
      ) : (
        <>
          <path d="M3 7h18" />
          <path d="M3 12h18" />
          <path d="M3 17h18" />
        </>
      )}
    </svg>
  );
}

/* ----------------------------------------------------------------------- hero */

function Hero() {
  return (
    <header className="lp-section" style={{ paddingTop: "clamp(120px, 16vw, 200px)" }}>
      <div className="lp-container">
        <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <Reveal>
            <span className="lp-chip" style={{ marginBottom: 28 }}>
              <i style={{ background: "var(--green)", boxShadow: "0 0 8px var(--green)", animation: "blink 2.4s ease-in-out infinite" }} />
              Live on Stellar testnet · shield → transfer → unshield
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="lp-h1" style={{ marginBottom: 26 }}>
              Real-world value,
              <br />
              settled in the <em>dark</em>.
            </h1>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="lp-lead" style={{ margin: "0 auto 36px" }}>
              NoirRail shields tokenized treasuries, invoices, and credit on Stellar. Amounts and
              positions hide behind zero-knowledge proofs — openable on demand, in proof, to your
              auditor. A rail you can see through, but no one can{" "}
              <span style={{ color: "var(--cyan)", fontWeight: 500 }}>see into</span>.
            </p>
          </Reveal>
          <Reveal delay={0.22}>
            <div style={{ display: "flex", gap: 22, justifyContent: "center", flexWrap: "wrap" }}>
              <Magnetic strength={0.18}>
                <Link href="/app" className="lp-cta primary">
                  Launch <span className="arrow">→</span>
                </Link>
              </Magnetic>
              <Magnetic strength={0.12}>
                <a href="#how" className="lp-cta ghost">Explore the architecture</a>
              </Magnetic>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.32} y={40}>
          <Parallax amount={36} className="lp-float">
            <div style={{ maxWidth: 940, margin: "72px auto 0", position: "relative" }}>
              <div className="lp-glow amber" style={{ width: 380, height: 200, bottom: -40, left: "50%", transform: "translateX(-50%)", opacity: 0.35 }} />
              <TerminalMock />
            </div>
          </Parallax>
        </Reveal>

        <Reveal delay={0.4}>
          <p className="lp-eyebrow center" style={{ justifyContent: "center", marginTop: 28, color: "var(--ink-4)" }}>
            ↑ hover any shielded value to reveal it
          </p>
        </Reveal>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------- anchors */

function Anchors() {
  const names = ["Franklin Templeton", "BlackRock", "WisdomTree", "Ondo", "Securitize", "Circle"];
  const loop = [...names, ...names];
  return (
    <section className="lp-section tight">
      <div className="lp-container lp-center">
        <Reveal>
          <p className="lp-eyebrow center" style={{ justifyContent: "center", marginBottom: 28 }}>
            Where tokenized real-world assets already live
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="lp-mask-x" style={{ overflow: "hidden" }}>
            <motion.div
              className="lp-marquee"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 28, ease: "linear", repeat: Infinity }}
              style={{ width: "max-content" }}
            >
              {loop.map((n, i) => (
                <span key={i}>{n}</span>
              ))}
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- stats */

function Stats() {
  const items = [
    { v: <Counter to={18.6} decimals={1} prefix="$" suffix="B" />, k: "RWA on-chain, ex-stablecoin" },
    { v: <Counter to={35.8} decimals={1} suffix="%" />, k: "Tokenized-treasury share" },
    { v: <Counter to={20} suffix="×" />, k: "Walled-garden vs free TVL" },
    { v: <span className="num">3–5<em style={{ color: "var(--amber)", fontStyle: "normal", fontSize: "0.6em" }}>s</em></span>, k: "Settlement finality" },
  ];
  return (
    <section className="lp-section tight">
      <div className="lp-container">
        <Reveal>
          <div className="lp-stats">
            {items.map((s, i) => (
              <div className="lp-stat" key={i}>
                <div className="v">{s.v}</div>
                <div className="k">{s.k}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="lp-body lp-center" style={{ maxWidth: "64ch", margin: "28px auto 0", color: "var(--ink-4)" }}>
            The value moved on-chain. The privacy did not. Public ledgers leak strategy — so size
            retreats into walled gardens. Privacy is the unlock.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- features */

const FEATURES = [
  { ic: "◈", t: "Shielded by default", d: "Amounts and holder positions never touch the public ledger. The chain stores a Merkle root and a nullifier set — nothing legible.", accent: "rgba(91,217,210,0.4)", cls: "wide" },
  { ic: "⊞", t: "Arbitrary value, bound on-chain", d: "Not a fixed-denomination mixer. The deposited amount is recomputed into the note's commitment on-chain, so a note is worth exactly what was escrowed.", accent: "rgba(231,178,92,0.4)", cls: "wide" },
  { ic: "→", t: "Recipient-bound", d: "The payee is bound inside the proof. A watcher who copies a pending transaction cannot redirect the funds.", accent: "rgba(154,140,240,0.4)", cls: "" },
  { ic: "◐", t: "Auditable on demand", d: "Viewing keys and selective-disclosure proofs let a holder prove a fact — “under the limit”, “approved set” — without revealing the figure.", accent: "rgba(91,217,210,0.4)", cls: "" },
  { ic: "⌘", t: "In-browser proving", d: "snarkjs runs in a Web Worker. The secret note, the witness, the keys — none ever cross the network boundary.", accent: "rgba(231,178,92,0.4)", cls: "" },
  { ic: "✦", t: "One pairing per settlement", d: "A single Groth16 verification over BLS12-381, native on Soroban. Everything else is cheap bookkeeping over commitments and roots.", accent: "rgba(154,140,240,0.4)", cls: "full" },
];

function Features() {
  return (
    <section className="lp-section" id="features">
      <div className="lp-container">
        <Reveal>
          <p className="lp-eyebrow" style={{ marginBottom: 20 }}>The primitive</p>
        </Reveal>
        <Reveal delay={0.06}>
          <h2 className="lp-h2" style={{ maxWidth: "18ch", marginBottom: 18 }}>
            Confidentiality and auditability, <em>together</em>.
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="lp-lead" style={{ marginBottom: 48 }}>
            The two properties institutions actually need but rarely get at once. NoirRail makes
            confidentiality a protocol property — not a platform one.
          </p>
        </Reveal>
        <div className="lp-bento">
          {FEATURES.map((f, i) => (
            <Reveal key={i} delay={(i % 3) * 0.06} className={`lp-tile torch ${f.cls}`} style={{ "--accent": f.accent } as CSSProperties}>
              <div className="ic" aria-hidden>{f.ic}</div>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </Reveal>
          ))}
        </div>
        <MobileCarousel
          items={FEATURES}
          render={(f) => (
            <div className="lp-tile torch" style={{ "--accent": f.accent } as CSSProperties}>
              <div className="ic" aria-hidden>{f.ic}</div>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          )}
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- settlement path */

const STEPS = [
  { n: "01 · SHIELD", h: "Deposit becomes a secret", p: "A tokenized asset enters the pool. The holder posts a commitment; the balance vanishes from public view. Transparent at the edge, sealed thereafter." },
  { n: "02 · TRANSFER", h: "Settle privately", p: "Prove ownership of an unspent note and mint recipient notes. Amounts, sender, and receiver stay hidden; a nullifier prevents double-spend." },
  { n: "03 · UNSHIELD", h: "Exit in daylight, by choice", p: "Prove a valid note and a bound recipient, then release to a transparent address. The one moment value re-enters the light — on your terms." },
];

function SettlementPath() {
  return (
    <section className="lp-section" id="how">
      <div className="lp-container">
        <div className="lp-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", marginBottom: 56 }}>
          <div>
            <Reveal><p className="lp-eyebrow" style={{ marginBottom: 20 }}>The settlement path</p></Reveal>
            <Reveal delay={0.06}>
              <h2 className="lp-h2" style={{ marginBottom: 18 }}>
                A value is a <em>note</em>.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="lp-lead">
                Spending it reveals only a one-time nullifier — never the note. Everything else is a
                Merkle proof of inclusion, checked in zero knowledge. The link between a deposit and
                a spend never appears on-chain.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 28 }}>
                <span className="lp-chip"><i style={{ background: "var(--cyan)" }} /> commitment</span>
                <span className="lp-chip"><i style={{ background: "var(--amber)" }} /> nullifier</span>
                <span className="lp-chip"><i style={{ background: "var(--violet)" }} /> merkle root</span>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1} y={30}>
            <ChainView />
          </Reveal>
        </div>

        <div className="lp-steps">
          {STEPS.map((s, i) => (
            <Reveal key={i} delay={i * 0.08} className="lp-step torch">
              <div>
                <div className="n">{s.n}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <MobileCarousel
          items={STEPS}
          render={(s) => (
            <div className="lp-step torch">
              <div>
                <div className="n">{s.n}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            </div>
          )}
        />
      </div>
    </section>
  );
}

function ChainView() {
  return (
    <div className="lp-window torch" style={{ "--torch": "rgba(91,217,210,0.16)", "--accent": "rgba(91,217,210,0.5)" } as CSSProperties}>
      <div className="lp-chrome">
        <div className="lp-dots"><i /><i /><i /></div>
        <div className="lp-urlbar">what the chain remembers</div>
      </div>
      <div style={{ padding: 22, display: "grid", gap: 14 }}>
        {[
          { k: "commitment", v: "c = Poseidon( v, label, Poseidon(n, s) )", tone: "var(--cyan)" },
          { k: "nullifier", v: "nf = Poseidon( n )  · spent once", tone: "var(--amber)" },
          { k: "merkle root", v: "0x9c3d…6e90  · depth 14", tone: "var(--violet)" },
        ].map((r, i) => (
          <div key={i} style={{ borderLeft: `2px solid ${r.tone}`, paddingLeft: 14 }}>
            <div className="lp-asub">{r.k}</div>
            <div className="num" style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>{r.v}</div>
          </div>
        ))}
        <div className="hairline" style={{ margin: "4px 0" }} />
        <p className="lp-body" style={{ color: "var(--ink-4)", fontSize: 13 }}>
          No amount. No owner. No counterparty. Just commitments, a bounded root history, and spent
          nullifiers.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- security */

const SEES = [
  ["Public / chain", "hidden", "hidden", "hidden"],
  ["Holder", "full", "full", "full"],
  ["Auditor (granted)", "full", "scoped", "scoped"],
  ["Counterparty", "one tx", "self only", "hidden"],
];

function Security() {
  return (
    <section className="lp-section" id="security">
      <div className="lp-container">
        <Reveal><p className="lp-eyebrow" style={{ marginBottom: 20 }}>Auditability without surveillance</p></Reveal>
        <div className="lp-split" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 48, alignItems: "start" }}>
          <div>
            <Reveal delay={0.06}>
              <h2 className="lp-h2" style={{ marginBottom: 18 }}>
                The right party sees the right thing. <em>No one</em> sees everything.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="lp-lead">
                Privacy a regulator can't inspect is a liability. Disclosure is mandatory by design —
                there is no master key, and no single party can unmask the rail.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="lp-chip" style={{ marginTop: 28 }}>
                <i style={{ background: "var(--green)" }} /> No master key · revocable by design
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="lp-tablewrap">
            <table className="lp-table">
              <thead>
                <tr><th>Party</th><th>Amount</th><th>Counterparties</th><th>History</th></tr>
              </thead>
              <tbody>
                {SEES.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j} className={j === 0 ? "" : c === "hidden" ? "hide" : c.includes("full") || c === "one tx" ? "show" : ""}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ faq */

const QA: [string, string][] = [
  ["Is this a mixer?", "No. Disclosure is a first-class design goal, not an escape hatch. Holders grant viewing keys and produce selective-disclosure proofs so auditors keep a verifiable, revocable line of sight. NoirRail separates privacy from anonymity."],
  ["Where does it actually settle?", "Natively on Stellar via Soroban smart contracts — no rollup, no bridge. The pool custodies the underlying Stellar Asset Contract balance; finality is 3–5 seconds. A single Groth16 pairing is verified on-chain per settlement."],
  ["Do my secrets ever leave my device?", "Never. Notes are generated and stored locally, and proofs are produced in the browser with snarkjs in a Web Worker. Only the public proof and signals are submitted; the wallet signs the transaction."],
  ["What's actually live today?", "Phase 0 — the hackathon MVP — settles shield → transfer → unshield end-to-end on Stellar testnet, with in-browser proving validated byte-for-byte against the chain. Compliance disclosure, yield on hidden balances, and a multi-party trusted setup are later phases."],
  ["What cryptography is under the hood?", "Circom circuits, Groth16 proofs over BLS12-381, and Poseidon hashing — the exact stack the Stellar Development Foundation prototyped, extended from a fixed-denomination mixer into a value-bearing, recipient-bound settlement layer."],
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="lp-section" id="faq">
      <div className="lp-container" style={{ maxWidth: 860 }}>
        <Reveal><p className="lp-eyebrow" style={{ marginBottom: 20 }}>Questions, answered plainly</p></Reveal>
        <Reveal delay={0.06}><h2 className="lp-h2" style={{ marginBottom: 40 }}>Frequently asked.</h2></Reveal>
        <div className="lp-faq">
          {QA.map(([q, a], i) => (
            <Reveal key={i} delay={i * 0.04} className="lp-faq-item">
              <div>
                <button className="lp-faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                  {q}
                  <span className="pm" style={{ transform: open === i ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      className="lp-faq-a"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <p>{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ final cta */

function FinalCTA() {
  return (
    <section className="lp-section">
      <div className="lp-container">
        <Reveal y={30}>
          <div className="lp-final torch">
            <div className="lp-glow amber" style={{ width: 420, height: 220, top: -60, left: "50%", transform: "translateX(-50%)", opacity: 0.4 }} />
            <p className="lp-eyebrow center" style={{ justifyContent: "center", marginBottom: 24 }}>See for yourself</p>
            <h2 className="lp-h2" style={{ maxWidth: "20ch", margin: "0 auto 20px" }}>
              Settle a shielded value, <em>right now</em>.
            </h2>
            <p className="lp-lead" style={{ margin: "0 auto 36px", textAlign: "center" }}>
              Launch and move a position on Stellar testnet — amounts cyan and sealed, the
              proof generated in your browser, the settlement on-chain in seconds.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <Magnetic>
                <Link href="/app" className="lp-cta primary">Launch <span className="arrow">→</span></Link>
              </Magnetic>
              <Magnetic strength={0.25}>
                <a href="#features" className="lp-cta ghost">Back to the top</a>
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- footer */

function Footer() {
  const cols = [
    { h: "Product", links: [["Launch app", "/app"], ["Terminal", "/app/terminal"], ["Documentation", "/app/docs"]] },
    { h: "Architecture", links: [["Circuits", "#how"], ["Settlement path", "#how"], ["The book · 13 chapters", "#"]] },
    { h: "Stack", links: [["Stellar · Soroban", "#"], ["Circom · Groth16", "#"], ["BLS12-381", "#"]] },
  ];
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-foot-grid">
          <div>
            <div className="lp-wordmark" style={{ fontSize: 26, marginBottom: 16 }}>Noir<em>Rail</em></div>
            <p className="lp-body" style={{ maxWidth: "36ch", color: "var(--ink-3)" }}>
              Shielded settlement for tokenized real-world assets on Stellar. Confidential to the
              public, legible to the auditor.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              {["Stellar", "Soroban", "BLS12-381", "Shielded & auditable"].map((t) => (
                <span className="lp-chip" key={t} style={{ height: 26, fontSize: 10.5 }}>{t}</span>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div className="lp-foot-h">{c.h}</div>
              {c.links.map(([t, href]) => (
                <a key={t} className="lp-foot-link" href={href}>{t}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="hairline" style={{ margin: "40px 0 24px" }} />
        <div className="between" style={{ flexWrap: "wrap", gap: 12 }}>
          <span className="lp-asub" style={{ color: "var(--ink-4)" }}>Obsidian Clearing · v1.0 — engineering preview</span>
          <span className="lp-asub" style={{ color: "var(--ink-4)" }}>Real-world value, settled in the dark.</span>
        </div>
      </div>
    </footer>
  );
}
