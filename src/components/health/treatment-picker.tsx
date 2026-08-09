"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";

import { NativeSelect } from "@/components/common/native-select";
import { methodLabels } from "@/components/health/recipe-labels";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  amountForVolume,
  formatAmount,
  formatConcentration,
} from "@/lib/dose";
import type { RecipeRow } from "@/server/queries/recipes";

/**
 * Turns a stored recipe into the treatment text for a finding.
 *
 * The amounts are written out rather than linked. A prescription has to stay
 * true to what was actually ordered — if the recipe is revised next month, the
 * record of what this plant was given must not quietly change with it.
 */
function describe(recipe: RecipeRow): string {
  const lines = recipe.items.map(
    (item) =>
      `- ${item.material.name}: ${formatAmount(
        amountForVolume(item, recipe.basisVolumeL)
      )} ${item.material.unit} (${formatConcentration(item)})`
  );

  const parts = [
    `${recipe.name} — ${methodLabels[recipe.method]}, ${recipe.basisVolumeL} liter`,
    ...lines,
  ];

  if (recipe.intervalDays) parts.push(`Ulangi tiap ${recipe.intervalDays} hari.`);
  if (recipe.preHarvestIntervalDays) {
    parts.push(
      `Masa tunggu panen ${recipe.preHarvestIntervalDays} hari setelah aplikasi.`
    );
  }
  if (recipe.notes) parts.push(recipe.notes);

  return parts.join("\n");
}

export function TreatmentPicker({
  recipes,
  onApply,
}: {
  recipes: RecipeRow[];
  onApply: (text: string) => void;
}) {
  const [selected, setSelected] = useState(recipes[0]?.id ?? "");

  if (recipes.length === 0) return null;

  const recipe = recipes.find((r) => r.id === selected);

  return (
    <div className="bg-muted/40 grid gap-2 rounded-md border p-3">
      <Label htmlFor="treatment-recipe" className="text-xs">
        Ambil dari Pustaka Racikan
      </Label>
      <div className="flex gap-2">
        <NativeSelect
          id="treatment-recipe"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="min-w-0 flex-1"
        >
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.targetIssue ? `${r.targetIssue} — ` : ""}
              {r.name}
            </option>
          ))}
        </NativeSelect>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!recipe}
          onClick={() => recipe && onApply(describe(recipe))}
        >
          <ClipboardList className="size-4" aria-hidden />
          Isikan
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Takaran disalin apa adanya, jadi catatan perlakuan tetap sesuai yang
        diresepkan walau racikannya direvisi nanti.
      </p>
    </div>
  );
}
