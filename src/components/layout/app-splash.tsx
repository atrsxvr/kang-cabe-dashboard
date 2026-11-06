"use client";

import { useEffect, useState } from "react";

/** Long enough not to flash on a fast load; never added on a slow one. */
const MIN_VISIBLE_MS = 500;

/**
 * The green Kang Cabe screen on first opening the app, until it is ready.
 *
 * Part of the first HTML, so it shows before any JavaScript runs, and taken
 * away once the page has hydrated — not on a timer. Should the JavaScript
 * never arrive, `.app-splash` in globals.css hides it after 8 seconds on its
 * own, so a failed load is never a screen nobody can get past.
 *
 * Rendered in the root layout, which stays mounted across navigations inside
 * the app: it appears on entering, not on every page change.
 */
export function AppSplash() {
  const [phase, setPhase] = useState<"shown" | "leaving" | "gone">("shown");

  useEffect(() => {
    const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
    const leave = window.setTimeout(() => setPhase("leaving"), wait);
    const gone = window.setTimeout(() => setPhase("gone"), wait + 300);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(gone);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className={`app-splash fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#14532d] transition-opacity duration-300 ${
        phase === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- must render before JS, unoptimised on purpose */}
      <img src="/icons/icon-192.png" alt="" width={96} height={96} className="rounded-2xl" />
      <p className="mt-5 text-2xl font-bold text-white">Kang Cabe</p>
      <p className="mt-1 text-sm text-green-200">Dashboard Kebun</p>
      <div className="mt-8 flex gap-1.5">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="size-2 rounded-full bg-green-200 motion-safe:animate-pulse"
            style={{ animationDelay: `${dot * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
