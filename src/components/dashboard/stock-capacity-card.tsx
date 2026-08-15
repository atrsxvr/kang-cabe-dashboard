import Link from "next/link";
import { FlaskConical, TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatKg } from "@/lib/harvest";
import { cn } from "@/lib/utils";
import type { HarvestTrend, MixCapacity } from "@/server/queries/dashboard";

/**
 * Two questions the data could always answer and nobody could ask.
 *
 * "Is there enough for the next mix" is the payoff of one shared Material row
 * between the recipe library and the shed; it was sitting there uncomputed.
 */
export function StockCapacityCard({
  mixCapacity,
  trend,
}: {
  mixCapacity: MixCapacity[];
  trend: HarvestTrend;
}) {
  const up = trend.changePercent !== null && trend.changePercent >= 0;
  const Trend = up ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardContent className="grid gap-4 py-5">
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Trend
              className={cn(
                "size-4",
                trend.changePercent === null
                  ? "text-muted-foreground"
                  : up
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400",
              )}
              aria-hidden
            />
            <h2 className="text-sm font-medium">Panen 7 hari terakhir</h2>
          </div>

          <p className="text-2xl font-semibold tabular-nums">
            {formatKg(trend.thisWeekKg)}
          </p>
          <p className="text-muted-foreground text-xs">
            {trend.changePercent === null
              ? "Belum ada pembanding minggu sebelumnya."
              : `${up ? "Naik" : "Turun"} ${Math.abs(trend.changePercent)}% dari ${formatKg(trend.lastWeekKg)} minggu sebelumnya.`}
          </p>
        </div>

        <div className="grid gap-2 border-t pt-4">
          <div className="flex items-center gap-2">
            <FlaskConical
              className="text-muted-foreground size-4"
              aria-hidden
            />
            <h2 className="text-sm font-medium">Stok cukup buat berapa kali</h2>
          </div>

          {mixCapacity.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Belum ada racikan rutin yang bisa dihitung.
            </p>
          ) : (
            <ul className="grid gap-1.5">
              {mixCapacity.map((mix) => (
                <li
                  key={mix.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 truncate">{mix.name}</span>
                  <span
                    className={cn(
                      "tabular-nums",
                      mix.batches === 0
                        ? "text-destructive font-medium"
                        : mix.batches <= 2
                          ? "text-amber-700 dark:text-amber-400"
                          : "",
                    )}
                  >
                    {mix.batches === 0
                      ? `habis — ${mix.limitedBy}`
                      : `${mix.batches}× lagi`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-muted-foreground text-xs">
            Dihitung pada volume acuan tiap racikan, dibatasi bahan yang paling
            dulu habis.{" "}
            <Link href="/inventory" className="underline">
              Buka Inventaris
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
