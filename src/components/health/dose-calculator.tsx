"use client";

import { useState } from "react";
import { Beaker, RotateCcw } from "lucide-react";

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

/**
 * The point of the whole module. Nobody gets the choice of fertiliser wrong —
 * they get the arithmetic wrong turning "2 g/L" into "how much for our tank",
 * and a factor of ten there burns the crop.
 */
export function DoseCalculator({ recipe }: { recipe: RecipeRow }) {
  const [litres, setLitres] = useState(String(recipe.basisVolumeL));

  const parsed = parseAmount(litres);
  const valid = Number.isFinite(parsed) && parsed > 0;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-2">
          <Label htmlFor={`litres-${recipe.id}`}>Volume air</Label>
          <div className="flex items-center gap-2">
            <Input
              id={`litres-${recipe.id}`}
              value={litres}
              onChange={(event) => setLitres(event.target.value)}
              inputMode="decimal"
              className="w-24"
              aria-invalid={!valid}
            />
            <span className="text-muted-foreground text-sm">liter</span>
            {parsed !== recipe.basisVolumeL ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setLitres(String(recipe.basisVolumeL))}
              >
                <RotateCcw className="size-3.5" aria-hidden />
                {recipe.basisVolumeL} L
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {!valid ? (
        <p className="text-destructive text-sm" role="alert">
          Masukkan volume lebih dari 0.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Bahan</th>
                <th className="px-3 py-2 text-right font-medium">Takaran</th>
                <th className="text-muted-foreground hidden px-3 py-2 text-right font-normal sm:table-cell">
                  Konsentrasi
                </th>
              </tr>
            </thead>
            <tbody>
              {recipe.items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">
                    {item.material.name}
                    {item.note ? (
                      <span className="text-muted-foreground block text-xs">
                        {item.note}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {formatAmount(amountForVolume(item, parsed))}{" "}
                    <span className="text-muted-foreground font-normal">
                      {item.material.unit}
                    </span>
                  </td>
                  <td className="text-muted-foreground hidden px-3 py-2 text-right text-xs tabular-nums sm:table-cell">
                    {formatConcentration(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
        <Beaker className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Takaran dihitung dari konsentrasi per liter, jadi tetap benar untuk
        tangki ukuran berapa pun.
      </p>
    </div>
  );
}
