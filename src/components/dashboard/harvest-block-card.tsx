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

  // All clear is a strip, not a card. The warning below is what earns the
  // space at the top of the page; "nothing to wait for" said at the same size
  // pushed today's tasks off a phone's first screen every day it was true.
  if (!worst) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <ShieldCheck
          className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
        <p className="text-xs leading-snug sm:text-sm">
          <span className="font-medium text-emerald-800 dark:text-emerald-300">
            Aman dipanen
          </span>{" "}
          <span className="text-muted-foreground">
            · nggak ada masa tunggu yang masih jalan.
          </span>
        </p>
      </div>
    );
  }

  return (
    // A ring, not a border: the card draws its edge with ring-1, so a border
    // colour here never showed and the warning looked like any other card.
    <Card className="ring-rose-300 dark:ring-rose-900/60">
      <CardContent className="grid gap-2">
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
              Aman mulai {formatDate(worst.safeFrom)}. Habis di-spray{" "}
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
