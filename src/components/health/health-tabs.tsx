"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Leaf, ScrollText, Sprout } from "lucide-react";

import { SEASON_PARAM, withSeason } from "@/lib/season-param";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/health", label: "Temuan", icon: Leaf, seasonAware: true },
  {
    href: "/health/racikan",
    label: "Pustaka Racikan",
    icon: ScrollText,
    // Recipes are not season-scoped, but the link still carries the season so
    // going back to Temuan lands in the same context.
    seasonAware: true,
  },
  // Plant losses live here rather than in a menu of their own: a dead plant is
  // a health event, its cause is usually something already reported as a
  // finding, and the agronomist who cares is already on this page.
  { href: "/health/populasi", label: "Populasi", icon: Sprout, seasonAware: true },
];

export function HealthTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const seasonId = searchParams.get(SEASON_PARAM);

  return (
    <div
      role="navigation"
      aria-label="Bagian Kesehatan & Monitoring"
      className="bg-muted mb-6 inline-flex max-w-full justify-start gap-1 overflow-x-auto rounded-lg p-1"
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;

        return (
          <Link
            key={href}
            href={withSeason(href, seasonId)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              active
                ? "bg-background shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
