import { Clock, Droplets, ShieldAlert, SprayCan } from "lucide-react";

import { DoseCalculator } from "@/components/health/dose-calculator";
import {
  kindLabels,
  methodLabels,
  phaseLabels,
  phaseTones,
} from "@/components/health/recipe-labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RecipeRow } from "@/server/queries/recipes";

export function RecipeCard({ recipe }: { recipe: RecipeRow }) {
  const Method = recipe.method === "KOCOR" ? Droplets : SprayCan;

  return (
    <Card>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
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
            <span className="text-muted-foreground text-xs">
              {kindLabels[recipe.kind]}
            </span>
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1">
              <Method className="size-3.5" aria-hidden />
              {methodLabels[recipe.method]}
            </span>
            {recipe.intervalDays ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden />
                Ulangi tiap {recipe.intervalDays} hari
              </span>
            ) : null}
          </div>

          {recipe.notes ? (
            <p className="text-muted-foreground text-sm">{recipe.notes}</p>
          ) : null}
        </div>

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
    </Card>
  );
}
