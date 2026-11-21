import type { LucideIcon } from "lucide-react";

import { CountUp } from "@/components/common/count-up";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Past this many characters a figure steps down a size on a phone, where
 * the card is half of 360px. "4.250.000" is nine and still fits.
 */
const LONG_VALUE = 9;

export function SummaryCard({
  title,
  value,
  prefix,
  unit,
  hint,
  icon: Icon,
  count,
}: {
  title: string;
  value: string;
  /**
   * Small text before the figure — "Rp". Set apart rather than written into
   * `value`, so the currency stays small and the figure is the one thing
   * that never breaks across two lines; "Rp" alone on a line, the amount
   * below it, is how it read at 360px.
   */
  prefix?: string;
  /**
   * Count up to this the first time the app shows it. Kilos and days only —
   * never rupiah (see CountUp). `value` is still the text when absent.
   */
  count?: { to: number; decimals?: number };
  unit?: string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    // Tighter on a phone: two of these sit side by side above everything
    // actionable, and every pixel they take pushes "Dikerjakan hari ini"
    // further down.
    <Card className="[--card-spacing:--spacing(3)] sm:[--card-spacing:--spacing(4)]">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-1 sm:pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium sm:text-sm">
          {title}
        </CardTitle>
        <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          {prefix ? (
            <span className="text-muted-foreground text-xs font-medium sm:text-sm">
              {prefix}
            </span>
          ) : null}
          <span
            className={cn(
              "font-semibold tracking-tight whitespace-nowrap tabular-nums sm:text-2xl",
              value.length > LONG_VALUE ? "text-lg" : "text-xl",
            )}
          >
            {count ? (
              <CountUp id={title} value={count.to} decimals={count.decimals} />
            ) : (
              value
            )}
          </span>
          {unit ? (
            <span className="text-muted-foreground text-sm">{unit}</span>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-1 text-[11px] leading-tight sm:text-xs">
          {hint}
        </p>
      </CardContent>
    </Card>
  );
}
