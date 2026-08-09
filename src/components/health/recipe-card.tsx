"use client";

import { useState } from "react";
import {
  ChevronDown,
  Clock,
  Droplets,
  ShieldAlert,
  SprayCan,
} from "lucide-react";

import { DoseCalculator } from "@/components/health/dose-calculator";
import {
  kindLabels,
  methodLabels,
  phaseLabels,
  phaseTones,
} from "@/components/health/recipe-labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { amountForVolume, formatAmount } from "@/lib/dose";
import { cn } from "@/lib/utils";
import type { RecipeRow } from "@/server/queries/recipes";

/**
 * Collapsed by default. Every card carries a full calculator table, so an
 * expanded library scrolls for pages and the recipes at the bottom become
 * unreadable — while in practice only the one being mixed needs its numbers.
 *
 * The collapsed row still lists the amounts at the reference volume, so it
 * answers "what goes in this" without opening anything.
 */
export function RecipeCard({ recipe }: { recipe: RecipeRow }) {
  const [open, setOpen] = useState(false);
  const Method = recipe.method === "KOCOR" ? Droplets : SprayCan;

  const summary = recipe.items
    .map(
      (item) =>
        `${item.material.name} ${formatAmount(
          amountForVolume(item, recipe.basisVolumeL)
        )} ${item.material.unit}`
    )
    .join(" · ");

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="hover:bg-muted/40 focus-visible:ring-ring w-full px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium">{recipe.name}</h3>
              {recipe.phase ? (
                <Badge
                  variant="secondary"
                  className={cn("border-transparent", phaseTones[recipe.phase])}
                >
                  {phaseLabels[recipe.phase]}
                </Badge>
              ) : null}
              {recipe.targetIssue ? (
                <Badge variant="secondary" className="border-transparent">
                  {recipe.targetIssue}
                </Badge>
              ) : null}
              {recipe.preHarvestIntervalDays ? (
                <Badge
                  variant="secondary"
                  className="border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400"
                >
                  Tunggu {recipe.preHarvestIntervalDays} hari
                </Badge>
              ) : null}
            </div>

            <p className="text-muted-foreground mt-1 truncate text-xs">
              {summary}
              <span className="opacity-70"> @ {recipe.basisVolumeL} L</span>
            </p>

            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1">
                <Method className="size-3.5" aria-hidden />
                {methodLabels[recipe.method]}
              </span>
              {recipe.intervalDays ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden />
                  Tiap {recipe.intervalDays} hari
                </span>
              ) : null}
              <span>{kindLabels[recipe.kind]}</span>
            </div>
          </div>

          <ChevronDown
            className={cn(
              "text-muted-foreground mt-1 size-4 shrink-0 transition-transform",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </div>
      </button>

      {open ? (
        <CardContent className="grid gap-4 border-t px-4 py-4">
          {recipe.notes ? (
            <p className="text-muted-foreground text-sm">{recipe.notes}</p>
          ) : null}

          {recipe.preHarvestIntervalDays ? (
            // Loud on purpose. The garden harvests continuously, so a spray
            // blocks picking for these days — invisible on the plant, and the
            // produce is unsellable if it is ignored.
            <p className="flex items-start gap-2 rounded-md bg-amber-500/12 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Masa tunggu panen{" "}
                <strong>{recipe.preHarvestIntervalDays} hari</strong> — jangan
                panen sebelum lewat.
              </span>
            </p>
          ) : null}

          <DoseCalculator recipe={recipe} />
        </CardContent>
      ) : null}
    </Card>
  );
}
