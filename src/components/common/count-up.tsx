"use client";

import { useLayoutEffect, useState } from "react";

const DURATION_MS = 450;
/** The first-open splash, which hides whatever is under it (app-splash.tsx). */
const SPLASH = ".app-splash";

/**
 * Counted already this session, by id. Module state, so it survives moving
 * between pages and is forgotten on a reload — the count plays once per
 * opening of the app, not every visit to the dashboard.
 */
const played = new Set<string>();

/**
 * A number that counts up from zero the first time it is shown.
 *
 * Never on money. For a moment it shows a figure that is not true, and a
 * rupiah amount that is briefly wrong is exactly what nobody should be left
 * remembering. Kilos and days are fine.
 *
 * The real value is in the server HTML and in a screen-reader-only copy, so
 * nothing depends on the animation. A new value arriving later (LiveRefresh,
 * another season) is shown as it is.
 */
export function CountUp({
  id,
  value,
  decimals = 0,
}: {
  /** Which figure this is, so it plays once however often it re-mounts. */
  id: string;
  value: number;
  decimals?: number;
}) {
  const [shown, setShown] = useState<number | null>(null);

  // Layout effect: the zero is in place before the first paint after a
  // client-side navigation, so the final figure never flashes first.
  useLayoutEffect(() => {
    if (played.has(id)) return;
    if (
      value <= 0 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      played.add(id);
      return;
    }

    let frame = 0;
    let poll = 0;
    let cancelled = false;

    const run = () => {
      // Marked when it actually starts, not when the effect does: React's
      // dev double-run would otherwise use up the one play on a mount that
      // is thrown away.
      played.add(id);
      const start = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / DURATION_MS);
        const eased = 1 - (1 - t) ** 3;
        setShown(t < 1 ? value * eased : null);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect -- the start of an animation, not derived state
    setShown(0);

    // On the first open the splash is still up: count once it has gone, or
    // the whole animation plays where nobody can see it.
    const waitedSince = performance.now();
    const whenVisible = () => {
      if (cancelled) return;
      if (document.querySelector(SPLASH) && performance.now() - waitedSince < 3000) {
        poll = window.setTimeout(whenVisible, 100);
        return;
      }
      run();
    };
    // Async even when nothing is in the way, so a discarded dev mount is
    // cleaned up before it can mark this figure as played.
    poll = window.setTimeout(whenVisible, 0);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(poll);
      setShown(null);
    };
  }, [id, value]);

  const format = (n: number) =>
    n.toLocaleString("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  return (
    <>
      <span aria-hidden>{format(shown ?? value)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
