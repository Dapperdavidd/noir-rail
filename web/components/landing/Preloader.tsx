"use client";

import { useEffect, useState } from "react";

/**
 * Minimal boot screen shown before the landing page reveals. Holds for a brief
 * beat (or until window load), then fades out. Shown once per browser session so
 * repeat in-app navigation never re-triggers it.
 */
export function Preloader() {
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("nr.booted") === "1") {
      setDone(true);
      setGone(true);
      return;
    }

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const hold = reduce ? 300 : 1100;

    const finish = () => {
      sessionStorage.setItem("nr.booted", "1");
      setDone(true);
      // unmount after the fade-out transition completes
      window.setTimeout(() => setGone(true), 750);
    };

    const t = window.setTimeout(finish, hold);
    return () => window.clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <div className={`nr-pre ${done ? "done" : ""}`} aria-hidden={done} role="status">
      <div className="nr-pre-inner">
        <div className="nr-pre-wm">
          Noir<em>Rail</em>
        </div>
        <div className="nr-pre-bar">
          <i />
        </div>
      </div>
    </div>
  );
}
