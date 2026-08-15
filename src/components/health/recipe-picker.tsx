"use client";

import { useId, useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";

import { NativeSelect } from "@/components/common/native-select";
import {
  kindLabels,
  methodLabels,
  phaseLabels,
} from "@/components/health/recipe-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  amountForVolume,
  formatAmount,
  formatConcentration,
  parseAmount,
} from "@/lib/dose";
import type { RecipeRow } from "@/server/queries/recipes";

export type PickedRecipe = {
  recipeId: string;
  name: string;
  volumeL: number;
  text: string;
  /** Copied amounts, for deducting stock when the work is done. */
  materials: { materialId: string; amount: number }[];
};

/**
 * Writes a recipe out at the volume actually being mixed.
 *
 * The amounts are written as text rather than left as a link: a prescription
 * has to stay true to what was ordered, even if the recipe is revised next
 * month. The structured copy rides along separately so stock can be deducted
 * against the same figures.
 */
function describe(recipe: RecipeRow, litres: number): string {
  const lines = recipe.items.map(
    (item) =>
      `- ${item.material.name}: ${formatAmount(
        amountForVolume(item, litres),
      )} ${item.material.unit} (${formatConcentration(item)})`,
  );

  const parts = [
    `${recipe.name} — ${methodLabels[recipe.method]}, ${litres} liter`,
    ...lines,
  ];

  if (recipe.intervalDays)
    parts.push(`Ulangi tiap ${recipe.intervalDays} hari.`);
  if (recipe.preHarvestIntervalDays) {
    parts.push(
      `Masa tunggu panen ${recipe.preHarvestIntervalDays} hari setelah aplikasi.`,
    );
  }
  if (recipe.notes) parts.push(recipe.notes);

  return parts.join("\n");
}

export function RecipePicker({
  recipes,
  onApply,
  label = "Ambil dari Pustaka Racikan",
}: {
  recipes: RecipeRow[];
  onApply: (picked: PickedRecipe) => void;
  label?: string;
}) {
  const uid = useId();
  const [selected, setSelected] = useState(recipes[0]?.id ?? "");
  const recipe = recipes.find((r) => r.id === selected);
  const [litres, setLitres] = useState(String(recipe?.basisVolumeL ?? 45));

  const parsed = parseAmount(litres);
  const valid = Number.isFinite(parsed) && parsed > 0;

  // Routine and treatment are different jobs; grouping keeps a nutrition mix
  // from hiding among the sprays.
  const groups = useMemo(
    () => ({
      ROUTINE: recipes.filter((r) => r.kind === "ROUTINE"),
      TREATMENT: recipes.filter((r) => r.kind === "TREATMENT"),
    }),
    [recipes],
  );

  if (recipes.length === 0) return null;

  const choose = (id: string) => {
    setSelected(id);
    // Reset to the new recipe's own reference volume; carrying the previous
    // one over would quietly mis-scale a different mix.
    const next = recipes.find((r) => r.id === id);
    if (next) setLitres(String(next.basisVolumeL));
  };

  const apply = () => {
    if (!recipe || !valid) return;

    onApply({
      recipeId: recipe.id,
      name: recipe.name,
      volumeL: parsed,
      text: describe(recipe, parsed),
      materials: recipe.items.map((item) => ({
        materialId: item.material.id,
        amount: amountForVolume(item, parsed),
      })),
    });
  };

  return (
    <div className="bg-muted/40 grid gap-3 rounded-md border p-3">
      <Label htmlFor={`${uid}-recipe`} className="text-xs">
        {label}
      </Label>

      <NativeSelect
        id={`${uid}-recipe`}
        value={selected}
        onChange={(event) => choose(event.target.value)}
      >
        {(["ROUTINE", "TREATMENT"] as const).map((kind) =>
          groups[kind].length > 0 ? (
            <optgroup key={kind} label={kindLabels[kind]}>
              {groups[kind].map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.phase ? ` · ${phaseLabels[r.phase]}` : ""}
                  {r.targetIssue ? ` · ${r.targetIssue}` : ""}
                </option>
              ))}
            </optgroup>
          ) : null,
        )}
      </NativeSelect>

      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor={`${uid}-volume`} className="text-xs">
            Volume air
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={`${uid}-volume`}
              value={litres}
              onChange={(event) => setLitres(event.target.value)}
              inputMode="decimal"
              className="w-24"
              aria-invalid={!valid}
            />
            <span className="text-muted-foreground text-sm">liter</span>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!recipe || !valid}
          onClick={apply}
        >
          <ClipboardList className="size-4" aria-hidden />
          Isikan
        </Button>
      </div>

      {recipe && valid ? (
        <ul className="text-muted-foreground grid gap-0.5 text-xs">
          {recipe.items.map((item) => (
            <li key={item.id} className="tabular-nums">
              {item.material.name}{" "}
              <strong className="text-foreground">
                {formatAmount(amountForVolume(item, parsed))}{" "}
                {item.material.unit}
              </strong>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-muted-foreground text-xs">
        Takaran disalin apa adanya, jadi catatannya tetap sesuai yang diracik
        walau racikannya direvisi nanti.
      </p>
    </div>
  );
}
