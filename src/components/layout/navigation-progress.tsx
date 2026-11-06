"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const START = "kang-cabe:navigation-start";

/**
 * For navigations that are not a link tap — `router.push` from a select, say.
 * Links are noticed on their own.
 */
export function startNavigationProgress() {
  window.dispatchEvent(new Event(START));
}

const SKELETON = "kang-cabe:skeleton";

/**
 * Rendered inside every loading.tsx skeleton (via `Loading`). With a
 * skeleton per route, Next swaps the address in at once and the page's data
 * arrives later — so "the address changed" is not "the page is here". The
 * skeleton leaving is.
 */
export function SkeletonSignal() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(SKELETON, { detail: 1 }));
    return () => {
      window.dispatchEvent(new CustomEvent(SKELETON, { detail: -1 }));
    };
  }, []);
  return null;
}

/**
 * A thin green bar along the top the moment a link is tapped, running until
 * the new page has arrived — not just its skeleton.
 *
 * The skeletons say what is coming; this says, before any of that can
 * render, that the tap was received, and keeps saying it while the data is
 * on its way. On a phone over 4G, or with the server waking up, that wait is
 * when people tap again.
 *
 * It does not know how far along the load is — nothing does — so it eases
 * towards 85% and waits there, then completes on arrival.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = `${pathname}?${search}`;

  // The address a tap started from: until we have left it, the tap is
  // still pending.
  const [from, setFrom] = useState<string | null>(null);
  // Skeletons on screen right now.
  const [skeletons, setSkeletons] = useState(0);
  // Whether the bar is out at all, so finishing can be animated.
  const [shown, setShown] = useState(false);

  const running = (from !== null && from === here) || skeletons > 0;

  useEffect(() => {
    let giveUp: number | undefined;
    const start = () => {
      setFrom(`${window.location.pathname}?${new URLSearchParams(window.location.search)}`);
      setShown(true);
      // A navigation that never lands (offline, an error page) must not
      // leave the bar crawling forever.
      window.clearTimeout(giveUp);
      giveUp = window.setTimeout(() => setFrom(null), 15_000);
    };
    const onSkeleton = (event: Event) => {
      const step = (event as CustomEvent<number>).detail;
      setSkeletons((count) => Math.max(0, count + step));
      if (step > 0) setShown(true);
    };

    // Capture phase: Next's <Link> cancels the click to navigate on the
    // client, so by the bubbling phase it would look like nothing happened.
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // The page already open, or only a #fragment of it: nothing loads.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      start();
    };

    // No popstate: by the time it fires the address has already changed, so
    // there is no "from" to wait to leave. Going back is covered by the
    // skeleton signal alone.
    document.addEventListener("click", onClick, true);
    window.addEventListener(START, start);
    window.addEventListener(SKELETON, onSkeleton);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(START, start);
      window.removeEventListener(SKELETON, onSkeleton);
      window.clearTimeout(giveUp);
    };
  }, []);

  if (!shown) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5">
      <div
        className={`h-full origin-left bg-emerald-500 ${
          running
            ? "nav-progress-grow"
            : "scale-x-100 opacity-0 transition-[transform,opacity] duration-300 ease-out"
        }`}
        // Gone once its finishing fade has run.
        onTransitionEnd={() => {
          if (!running) {
            setShown(false);
            setFrom(null);
          }
        }}
        data-running={running || undefined}
      />
    </div>
  );
}
