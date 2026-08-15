import { ShieldAlert, ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/hst";
import type { SafeHarvest } from "@/server/queries/dashboard";

/**
 * How long picking has to wait after a spray.
 *
 * The only mistake this app can help with whose consequence leaves the garden.
 * Everything else here costs money or time; this one puts residue on chillies
 * somebody eats — and nothing about the plant shows it, so the date is the
 * only thing standing in the way.
 */
export function HarvestBlockCard({ blocks }: { blocks: SafeHarvest[] }) {
  const worst = blocks[0];

  if (!worst) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-5">
          <ShieldCheck
            className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
          <div>
            <p className="text-sm font-medium">Aman dipanen</p>
            <p className="text-muted-foreground text-xs">
              Nggak ada masa tunggu panen yang masih jalan.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-rose-300 dark:border-rose-900/60">
      <CardContent className="grid gap-2 py-5">
        <div className="flex items-start gap-3">
          <ShieldAlert
            className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-400"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="font-medium text-rose-700 dark:text-rose-400">
              Jangan panen dulu — {worst.daysLeft} hari lagi
            </p>
            <p className="text-muted-foreground text-xs">
              Aman mulai {formatDate(worst.safeFrom)}. Habis disemprot{" "}
              {worst.recipeName} tanggal {formatDate(worst.appliedAt)}.
            </p>
          </div>
        </div>

        {blocks.length > 1 ? (
          <ul className="text-muted-foreground grid gap-0.5 border-t pt-2 text-xs">
            {blocks.slice(1).map((block) => (
              <li key={`${block.recipeName}-${block.safeFrom.toISOString()}`}>
                {block.recipeName} · aman {formatDate(block.safeFrom)}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
