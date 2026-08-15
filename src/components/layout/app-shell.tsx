"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Sprout, X } from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Matches the `lg:` breakpoint, where the sidebar stops being a drawer. */
const DESKTOP = "(min-width: 64rem)";

export function AppShell({
  seasonSelector,
  children,
}: {
  /** Server-rendered node, streamed in via Suspense. */
  seasonSelector: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  // The drawer sits above the page on mobile; keep the page from scrolling
  // behind it.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Escape is the expected way out of an overlay.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Opening moves focus into the drawer, closing hands it back to the trigger —
  // otherwise a keyboard user is dropped at the top of the document.
  useEffect(() => {
    if (!open) {
      // Guarded so the very first render does not yank focus to the menu
      // button on page load.
      if (!wasOpen.current) return;
      wasOpen.current = false;

      // Hiding the drawer blurs whatever was focused inside it, which lands on
      // <body>. Either state means the drawer still owns the focus and should
      // hand it back; anything else is a deliberate move worth leaving alone.
      const active = document.activeElement;
      if (active === document.body || asideRef.current?.contains(active)) {
        openButtonRef.current?.focus();
      }
      return;
    }

    wasOpen.current = true;

    // focus() silently no-ops while the target is still `visibility: hidden`,
    // and the exact frame it becomes focusable depends on how the browser
    // sequences the class change against style recalc. Retry over a few frames
    // rather than guessing a single one.
    let frame = 0;
    let attempts = 0;

    const tryFocus = () => {
      const target = closeButtonRef.current;
      if (!target) return;

      target.focus();
      if (document.activeElement !== target && ++attempts < 10) {
        frame = requestAnimationFrame(tryFocus);
      }
    };

    frame = requestAnimationFrame(tryFocus);
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Resizing to desktop makes the drawer permanent, so the open state (and the
  // `inert` it puts on the main column) has to be dropped with it.
  useEffect(() => {
    const query = window.matchMedia(DESKTOP);
    const sync = () => {
      if (query.matches) setOpen(false);
    };

    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <div className="flex min-h-dvh">
      {/* Backdrop, mobile only */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={cn(
          "fixed inset-0 z-30 bg-black/50 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        ref={asideRef}
        aria-label="Menu utama"
        className={cn(
          "bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r",
          "duration-200 lg:visible lg:translate-x-0",
          // `invisible` is what actually removes the closed drawer from the tab
          // order — a merely translated element stays focusable.
          //
          // Visibility is transitioned only on the closing class, and that
          // asymmetry is deliberate: a transition defers the change in both
          // directions, so including it while opening would leave the drawer
          // hidden (and unfocusable) for the whole 200ms. Closing keeps it, so
          // the panel stays on screen for the slide-out.
          open
            ? "visible translate-x-0 transition-transform"
            : "invisible -translate-x-full transition-[transform,visibility]",
        )}
      >
        <div className="border-sidebar-border flex h-14 items-center gap-2 border-b px-4">
          <Sprout className="text-primary size-5 shrink-0" aria-hidden />
          <span className="truncate font-semibold">Kang Cabe</span>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="ml-auto lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>

        <p className="text-muted-foreground border-sidebar-border border-t px-4 py-3 text-xs">
          Kang Cabe — dashboard kebun
        </p>
      </aside>

      {/* While the drawer is open it owns the screen; the column behind it must
          not be reachable by tab or screen reader. */}
      <div inert={open} className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="bg-background/95 supports-backdrop-filter:bg-background/75 sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 backdrop-blur">
          <Button
            ref={openButtonRef}
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="lg:hidden"
            aria-label="Buka menu"
            aria-expanded={open}
          >
            <Menu className="size-5" />
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              Musim
            </span>
            {seasonSelector}
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
