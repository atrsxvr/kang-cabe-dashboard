"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { bottomNavItems, isActive } from "@/lib/nav";
import { SEASON_PARAM, withSeason } from "@/lib/season-param";
import { cn } from "@/lib/utils";

/**
 * Below `lg`, the five field modules sit along the bottom edge, where a thumb
 * reaches them one-handed — the ☰ in the top corner is the furthest point
 * from it. On a desktop the sidebar is always open and this is hidden.
 *
 * Like the sidebar, it carries the season along, and renders the same links
 * without it while useSearchParams is pending so nothing flickers.
 */
export function BottomNav() {
  return (
    <Suspense fallback={<Bar />}>
      <SeasonAwareBar />
    </Suspense>
  );
}

function SeasonAwareBar() {
  const searchParams = useSearchParams();
  return <Bar seasonId={searchParams.get(SEASON_PARAM)} />;
}

function Bar({ seasonId }: { seasonId?: string | null }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Menu bawah"
      // Its own name, so it holds still while a page rises in (globals.css).
      style={{ viewTransitionName: "app-bottom-nav" }}
      className="bg-background/95 supports-backdrop-filter:bg-background/90 fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {bottomNavItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);

          return (
            <li key={href}>
              <Link
                href={withSeason(href, seasonId)}
                aria-current={active ? "page" : undefined}
                className="group focus-visible:ring-ring flex h-16 flex-col items-center justify-center gap-1 text-[11px] leading-none font-medium focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
              >
                {/* The pill behind the active icon, as on Android: the place
                    you are is marked by shape as well as colour. */}
                <span
                  className={cn(
                    "flex h-7 w-14 items-center justify-center rounded-full transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span
                  className={
                    active ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
