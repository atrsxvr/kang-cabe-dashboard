"use client";

import { useEffect } from "react";

/** On a list: everything inside with a `data-fresh-key` is watched. */
export const FRESH_SCOPE = "data-fresh-scope";
/** On a row or card: the identity that tells "new" from "already here". */
export const FRESH_KEY = "data-fresh-key";

const FLASH_MS = 2200;
/** A dialog closing over the list is still in the way; wait for it, briefly. */
const DIALOG_OPEN =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';
const MAX_WAIT_MS = 4000;

/**
 * Tints the row that just appeared in a list, so after "Simpan" nobody has to
 * hunt through forty harvests for the one they typed.
 *
 * Works off the DOM rather than off each Server Action: a list marks itself
 * with `data-fresh-scope`, its rows with `data-fresh-key`, and whatever path
 * added the row — a dialog, a status button, someone else's save arriving by
 * LiveRefresh — the row lights up the same way.
 *
 * A list seen for the first time, or whose scope value changed (a filter, a
 * search), is only remembered, never lit: arriving on a page is not news, and
 * a row coming back into a filter is not new. A key seen once in a list never
 * lights again in it.
 *
 * Rendered from the shell, so it must never throw — a layout's failure skips
 * error.tsx and blanks the whole app.
 */
export function FreshRows() {
  useEffect(() => {
    const known = new WeakMap<Element, { scope: string; keys: Set<string> }>();
    let queued: HTMLElement[] = [];
    let frame = 0;
    let timer = 0;
    let waitedSince = 0;

    const rowsOf = (scope: Element) => {
      const rows = new Map<string, HTMLElement>();
      scope.querySelectorAll<HTMLElement>(`[${FRESH_KEY}]`).forEach((row) => {
        // A list nested inside another belongs to its own scope.
        if (row.closest(`[${FRESH_SCOPE}]`) !== scope) return;
        rows.set(row.getAttribute(FRESH_KEY) ?? "", row);
      });
      return rows;
    };

    const flash = (row: HTMLElement) => {
      if (!row.isConnected) return;
      const tint = getComputedStyle(document.documentElement)
        .getPropertyValue("--fresh")
        .trim();
      // Read by globals.css for the moments that belong to a fresh row, such
      // as a task's tick popping in.
      row.setAttribute("data-fresh-now", "");
      // Held for a moment, then faded back to whatever the row's own
      // background is — card or table row, light or dark — by leaving the
      // last keyframe for the browser to fill in.
      const animation = row.animate(
        [
          { backgroundColor: tint },
          { backgroundColor: tint, offset: 0.35 },
        ],
        { duration: FLASH_MS, easing: "ease-out" },
      );
      animation.onfinish = animation.oncancel = () =>
        row.removeAttribute("data-fresh-now");
    };

    const flush = () => {
      timer = 0;
      if (queued.length === 0) return;

      if (document.querySelector(DIALOG_OPEN)) {
        waitedSince ||= performance.now();
        if (performance.now() - waitedSince < MAX_WAIT_MS) {
          timer = window.setTimeout(flush, 120);
          return;
        }
      }

      waitedSince = 0;
      const rows = queued;
      queued = [];
      rows.forEach(flash);
    };

    const scan = () => {
      frame = 0;
      try {
        document
          .querySelectorAll(`[${FRESH_SCOPE}]`)
          .forEach((scope) => {
            const value = scope.getAttribute(FRESH_SCOPE) ?? "";
            const rows = rowsOf(scope);
            const seen = known.get(scope);

            if (!seen || seen.scope !== value) {
              known.set(scope, { scope: value, keys: new Set(rows.keys()) });
              return;
            }

            rows.forEach((row, key) => {
              if (seen.keys.has(key)) return;
              seen.keys.add(key);
              queued.push(row);
            });
          });

        if (queued.length > 0 && !timer) flush();
      } catch {
        // A tint is not worth a broken shell.
      }
    };

    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(scan);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [FRESH_SCOPE, FRESH_KEY],
    });
    scan();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
