"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { isActive, navItems } from "@/lib/nav";
import { SEASON_PARAM, withSeason } from "@/lib/season-param";
import { cn } from "@/lib/utils";

/**
 * useSearchParams opts the whole route out of prerendering unless it sits
 * behind a Suspense boundary. The fallback renders the same links without the
 * season attached, so the menu never flickers — only the hrefs settle.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavLinks onNavigate={onNavigate} />}>
      <SeasonAwareNavLinks onNavigate={onNavigate} />
    </Suspense>
  );
}

function SeasonAwareNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const searchParams = useSearchParams();

  // Navigation must not silently drop the season, or every click would reset
  // the user back to the default one.
  return (
    <NavLinks seasonId={searchParams.get(SEASON_PARAM)} onNavigate={onNavigate} />
  );
}

function NavLinks({
  seasonId,
  onNavigate,
}: {
  seasonId?: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);

        return (
          <Link
            key={href}
            href={withSeason(href, seasonId)}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
