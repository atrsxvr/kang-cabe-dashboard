"use client";

import { useId, useMemo, useState } from "react";
import { PackagePlus } from "lucide-react";

import { MaterialCombobox } from "@/components/common/material-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseAmount } from "@/lib/dose";
import { formatStock } from "@/lib/stock";
import type { StockRow } from "@/server/queries/inventory";

export type PickedMaterial = {
  materialId: string;
  name: string;
  unit: string;
  amount: number;
};

/**
 * Takes something straight off the shelf, with no recipe in between.
 *
 * Ajir, mulsa and seed are stock like any other — bought, counted, used up —
 * but none of them is measured per litre of water, so the recipe library has
 * no way to describe them. Without this they could only ever leave the shed
 * through the +/- buttons, which know nothing about seasons, and their cost
 * would never reach the season that consumed them.
 */
export function MaterialPicker({
  materials,
  exclude,
  onAdd,
}: {
  materials: StockRow[];
  /** Already on the task; offering them again would only create a conflict. */
  exclude: string[];
  onAdd: (picked: PickedMaterial) => void;
}) {
  const uid = useId();

  const available = useMemo(() => {
    const taken = new Set(exclude);
    return materials.filter((material) => !taken.has(material.id));
  }, [materials, exclude]);

  const [selected, setSelected] = useState("");
  const [amount, setAmount] = useState("");

  // Nothing chosen until someone chooses: defaulting to the first material
  // put fertiliser on tasks that never asked for any.
  const material = available.find((row) => row.id === selected) ?? null;

  const parsed = parseAmount(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;

  if (available.length === 0) return null;

  const add = () => {
    if (!material || !valid) return;

    onAdd({
      materialId: material.id,
      name: material.name,
      unit: material.unit,
      amount: parsed,
    });

    setSelected("");
    setAmount("");
  };

  return (
    <div className="bg-muted/40 grid gap-3 rounded-md border p-3">
      <Label htmlFor={`${uid}-material`} className="text-xs">
        Ambil bahan dari gudang (opsional)
      </Label>

      <MaterialCombobox
        id={`${uid}-material`}
        materials={available}
        value={material?.id ?? ""}
        onChange={setSelected}
        describe={(row) => {
          const stock = available.find((item) => item.id === row.id)?.stock ?? 0;
          return formatStock(stock, row.unit);
        }}
      />

      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor={`${uid}-amount`} className="text-xs">
            Jumlah
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={`${uid}-amount`}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              className="w-24"
              aria-invalid={amount !== "" && !valid}
            />
            <span className="text-muted-foreground text-sm">
              {material?.unit}
            </span>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!material || !valid}
          onClick={add}
        >
          <PackagePlus className="size-4" aria-hidden />
          Tambahkan
        </Button>
      </div>

      {material ? (
        <p className="text-muted-foreground text-xs">
          Stok sekarang {formatStock(material.stock, material.unit)}
          {valid && parsed > material.stock
            ? " — lebih dari yang ada, nanti ditolak pas dicatat pemakaiannya"
            : null}
        </p>
      ) : null}
    </div>
  );
}
