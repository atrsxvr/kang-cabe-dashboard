"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { SubmitButton } from "@/components/common/submit-button";
import { materialCategoryLabels } from "@/components/inventory/inventory-labels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatStock, OPNAME_PREFIX } from "@/lib/stock";
import { recordStockOpname } from "@/server/actions/inventory";
import type { MaterialCategory, StockRow } from "@/server/queries/inventory";
import type { MemberOption } from "@/server/queries/users";

/**
 * Physical count of the shed, reconciled against the recorded numbers.
 *
 * The rest of the app only ever guesses at stock: a task deducts what its
 * recipe *said* it would use, and a spill or a mis-measured scoop leaves no
 * trace at all. This is the one place the recorded number is allowed to be
 * overruled by what is actually on the shelf, which is why it is logistics'
 * job and not a side effect of finishing a task.
 */
export function StockOpnameDialog({
  rows,
  members,
}: {
  rows: StockRow[];
  members: MemberOption[];
}) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Kept so the differences can be shown as they are typed — an opname where
  // you cannot see the gap is just data entry.
  const [counted, setCounted] = useState<Record<string, string>>({});
  const router = useRouter();

  const reset = () => {
    setErrors({});
    setCounted({});
  };

  const diffs = rows
    .map((row) => {
      const raw = counted[row.id];
      if (raw === undefined || raw === "") return null;

      const value = Number(raw.replace(",", "."));
      if (!Number.isFinite(value) || value === row.stock) return null;

      return { row, delta: value - row.stock };
    })
    .filter((entry) => entry !== null);

  async function onSubmit(formData: FormData) {
    const result = await recordStockOpname(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setOpen(false);
    reset();
    toast.success(result.message ?? "Opname tersimpan.");
    router.refresh();
  }

  if (rows.length === 0) return null;

  // Grouped the way the shed is actually walked: fertiliser shelf, then
  // pesticides, then the rest.
  const groups = rows.reduce<Partial<Record<MaterialCategory, StockRow[]>>>(
    (acc, row) => {
      (acc[row.category] ??= []).push(row);
      return acc;
    },
    {}
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <ClipboardCheck className="size-4" aria-hidden />
          Opname Stok
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Opname Stok</DialogTitle>
          <DialogDescription>
            Isi hitungan fisik apa adanya. Yang dikosongkan berarti belum
            dihitung dan tidak diubah.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <div className="grid gap-4">
            {(
              Object.entries(groups) as [MaterialCategory, StockRow[]][]
            ).map(([category, items]) => (
              <fieldset key={category} className="grid gap-2">
                <legend className="text-muted-foreground mb-1 text-xs font-medium">
                  {materialCategoryLabels[category]}
                </legend>

                {items.map((row) => {
                  const raw = counted[row.id] ?? "";
                  const value = Number(raw.replace(",", "."));
                  const changed =
                    raw !== "" && Number.isFinite(value) && value !== row.stock;

                  return (
                    <div
                      key={row.id}
                      className="grid items-center gap-2 sm:grid-cols-[1fr_auto]"
                    >
                      <Label
                        htmlFor={`opname-${row.id}`}
                        className="text-sm font-normal"
                      >
                        {row.name}
                        <span className="text-muted-foreground ml-1 text-xs">
                          tercatat {formatStock(row.stock, row.unit)}
                        </span>
                      </Label>

                      <div className="flex items-center gap-2">
                        <Input
                          id={`opname-${row.id}`}
                          name={`${OPNAME_PREFIX}${row.id}`}
                          type="number"
                          min={0}
                          step="any"
                          inputMode="decimal"
                          className="w-28"
                          value={raw}
                          onChange={(event) =>
                            setCounted((current) => ({
                              ...current,
                              [row.id]: event.target.value,
                            }))
                          }
                          placeholder="—"
                        />
                        <span className="text-muted-foreground w-24 text-xs">
                          {changed ? (
                            <span
                              className={
                                value > row.stock
                                  ? "text-emerald-700 tabular-nums dark:text-emerald-400"
                                  : "text-destructive tabular-nums"
                              }
                            >
                              {value > row.stock ? "+" : "−"}
                              {formatStock(
                                Math.abs(value - row.stock),
                                row.unit
                              )}
                            </span>
                          ) : (
                            row.unit
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </fieldset>
            ))}
          </div>

          <Field id="opname-actor" label="Dihitung oleh" error={errors.actorId}>
            <NativeSelect id="opname-actor" name="actorId" defaultValue="">
              <option value="">— tidak disebutkan —</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            id="opname-note"
            label="Catatan (opsional)"
            error={errors.note}
          >
            <Input
              id="opname-note"
              name="note"
              placeholder="Opname akhir bulan"
            />
          </Field>

          <p className="text-muted-foreground text-xs">
            {diffs.length === 0
              ? "Belum ada selisih. Kalau semuanya cocok, tidak ada yang dicatat."
              : `${diffs.length} bahan akan dikoreksi dan tercatat sebagai koreksi di riwayat gudang.`}
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Batal
            </Button>
            <SubmitButton>Simpan Opname</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
