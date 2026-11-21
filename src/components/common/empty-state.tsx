import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A page with nothing in it yet: a chilli plant in an empty bed, the module's
 * own icon beside it, then what to do about it.
 *
 * One drawing for every module on purpose — it says "nothing here yet" in
 * the garden's voice, and the icon says which list it is. A blank card with
 * a grey glyph read as something having failed to load.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  compact = false,
  className,
}: {
  icon: LucideIcon;
  /** Left out where one sentence says it all. */
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** The way out, usually a button. */
  children?: React.ReactNode;
  /** For an empty state inside a panel rather than filling a page. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent
        className={cn(
          "flex flex-col items-center text-center",
          compact ? "gap-2 py-8" : "gap-3 py-12",
        )}
      >
        <GardenBed icon={Icon} small={compact} />
        <div className="max-w-sm">
          {title ? <p className="font-medium">{title}</p> : null}
          {description ? (
            <p className={cn("text-muted-foreground text-sm", title && "mt-1")}>
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function GardenBed({ icon: Icon, small }: { icon: LucideIcon; small: boolean }) {
  return (
    <div
      className={cn("relative", small ? "h-16 w-28" : "h-20 w-[132px]")}
      aria-hidden
    >
      <svg viewBox="0 0 120 72" className="size-full overflow-visible">
        {/* The bed, and a few clods of soil on it. */}
        <path
          d="M6 66 C24 55 96 55 114 66 Z"
          className="fill-amber-900/15 dark:fill-amber-200/10"
        />
        <circle cx="36" cy="62" r="1.6" className="fill-amber-900/25 dark:fill-amber-200/20" />
        <circle cx="82" cy="61" r="1.3" className="fill-amber-900/25 dark:fill-amber-200/20" />
        <circle cx="70" cy="64" r="1" className="fill-amber-900/25 dark:fill-amber-200/20" />

        <g className="empty-plant">
          <path
            d="M56 60 C56 50 55 38 57 24"
            fill="none"
            strokeWidth="2.4"
            strokeLinecap="round"
            className="stroke-emerald-700 dark:stroke-emerald-500"
          />
          <path
            d="M56 42 C47 41 42 35 43 30 C50 31 55 35 56 42 Z"
            className="fill-emerald-500 dark:fill-emerald-600"
          />
          <path
            d="M56.6 32 C65 29 69 23 68 18 C61 19 57 25 56.6 32 Z"
            className="fill-emerald-500 dark:fill-emerald-600"
          />
          <path
            d="M57 25 C53 20 53 16 55 13 C58 16 58.5 21 57 25 Z"
            className="fill-emerald-400 dark:fill-emerald-500"
          />
          {/* Two chillies, each on a stalk of its own, clear of the stem. */}
          <path
            d="M56.5 37 C60 37 62.5 38 64 40"
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="stroke-emerald-700 dark:stroke-emerald-500"
          />
          <path
            d="M62.6 40.4 C66.8 40 68.8 44 68.4 48.5 C68 52 67.2 54.6 65.8 56.6 C65.4 57.2 64.6 56.9 64.7 56.2 C65.1 53.2 64.8 49.4 63.8 46.4 C63.1 44.4 61.9 41.8 62.6 40.4 Z"
            className="fill-rose-600 dark:fill-rose-500"
          />
          <circle cx="63.6" cy="40.6" r="1.7" className="fill-emerald-600 dark:fill-emerald-500" />
          <path
            d="M55.8 45 C53.4 45 51.4 45.8 50 47.4"
            fill="none"
            strokeWidth="1.4"
            strokeLinecap="round"
            className="stroke-emerald-700 dark:stroke-emerald-500"
          />
          <path
            d="M50.9 47.2 C47.6 47.4 46.2 50.4 46.6 53.4 C46.8 55 47.3 56.2 48 57 C48.4 57.5 49.1 57.2 49 56.6 C48.8 54.8 49.2 52.6 50 50.9 C50.6 49.6 51.7 47.9 50.9 47.2 Z"
            className="fill-rose-500 dark:fill-rose-400"
          />
          <circle cx="50.6" cy="47.3" r="1.5" className="fill-emerald-600 dark:fill-emerald-500" />
        </g>
      </svg>

      <span
        className={cn(
          "bg-muted ring-card absolute top-1 right-1 flex items-center justify-center rounded-full ring-4",
          small ? "size-8" : "size-10",
        )}
      >
        <Icon className={cn("text-muted-foreground", small ? "size-4" : "size-5")} />
      </span>
    </div>
  );
}
