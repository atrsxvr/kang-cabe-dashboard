"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Pencil } from "lucide-react";
import { toast } from "sonner";

import { dateInputValue, Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { SubmitButton } from "@/components/common/submit-button";
import {
  materialCategoryLabels,
  UNIT_OPTIONS,
} from "@/components/inventory/inventory-labels";
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
import { Textarea } from "@/components/ui/textarea";
import { formatStock } from "@/lib/stock";
import { createMaterial, updateMaterial } from "@/server/actions/recipes";
import type { StockRow } from "@/server/queries/inventory";

/**
 * One row per material, shared by the recipe library and the shed. The unit
 * chosen here is the unit a recipe's dose is written in, which is why stock
 * uses it too — otherwise "is there enough for this mix" needs a conversion
 * nobody will get right in a hurry.
 */
export function MaterialDialog({
  material,
  compact = false,
}: {
  material?: StockRow;
  /** Small pencil for tight rows, e.g. the chips on the recipe page. */
  compact?: boolean;
}) {
  const editing = Boolean(material);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    const result = editing
      ? await updateMaterial(formData)
      : await createMaterial(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setOpen(false);
    toast.success(editing ? "Bahan diperbarui." : "Bahan ditambahkan.");
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setErrors({});
      }}
    >
      <DialogTrigger asChild>
        {editing ? (
          <Button
            variant="ghost"
            size={compact ? "icon" : "sm"}
            className={compact ? "size-8" : undefined}
            aria-label={`Edit ${material!.name}`}
          >
            <Pencil className="size-4" aria-hidden />
            {compact ? null : "Edit"}
          </Button>
        ) : (
          <Button size="sm">
            <FlaskConical className="size-4" aria-hidden />
            Tambah Bahan
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Bahan" : "Tambah Bahan"}</DialogTitle>
          <DialogDescription>
            Bahan dipakai bersama oleh Pustaka Racikan dan stok gudang, jadi
            satuannya berlaku untuk keduanya.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          {editing ? (
            <input type="hidden" name="materialId" value={material!.id} />
          ) : null}

          <Field id="material-name" label="Nama Bahan" error={errors.name}>
            <Input
              id="material-name"
              name="name"
              required
              defaultValue={material?.name}
              placeholder="NPK 16-16-16"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="material-unit" label="Satuan" error={errors.unit}>
              <NativeSelect
                id="material-unit"
                name="unit"
                defaultValue={material?.unit ?? "gram"}
              >
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field
              id="material-category"
              label="Kategori"
              error={errors.category}
            >
              <NativeSelect
                id="material-category"
                name="category"
                defaultValue={material?.category ?? "FERTILIZER"}
              >
                {Object.entries(materialCategoryLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </NativeSelect>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Read-only once the material exists. Every change to the number
                has to come from +/−, a recorded task, or an opname, because
                each of those writes the movement that explains it. An editable
                box here would be a way around the whole history. */}
            {editing ? (
              <div className="grid gap-2">
                <p className="text-sm font-medium">Stok Saat Ini</p>
                <p className="text-sm tabular-nums">
                  {formatStock(material!.stock, material!.unit)}
                </p>
                <p className="text-muted-foreground text-xs">
                  Diubah lewat tombol + / − atau Opname Stok, supaya alasannya
                  ikut tercatat.
                </p>
              </div>
            ) : (
              <Field
                id="material-stock"
                label="Stok Awal"
                error={errors.stock}
                hint="Yang sudah ada di gudang sekarang"
              >
                <Input
                  id="material-stock"
                  name="stock"
                  type="number"
                  min={0}
                  step="any"
                  required
                  defaultValue={0}
                  aria-invalid={Boolean(errors.stock)}
                />
              </Field>
            )}

            <Field
              id="material-minStock"
              label="Batas Minimum"
              error={errors.minStock}
              hint="Di bawah ini akan masuk daftar belanja"
            >
              <Input
                id="material-minStock"
                name="minStock"
                type="number"
                min={0}
                step="any"
                required
                defaultValue={material?.minStock ?? 0}
                aria-invalid={Boolean(errors.minStock)}
              />
            </Field>
          </div>

          {/* Without this the opening pile counts as free, and the first
              priced purchase drags the average down to something nobody can
              account for. */}
          {editing ? null : (
            <Field
              id="material-openingCost"
              label="Nilai stok awal (Rp)"
              error={errors.openingCost}
              hint="Kira-kira segitu senilai berapa. Boleh dikosongkan."
            >
              <Input
                id="material-openingCost"
                name="openingCost"
                inputMode="numeric"
                placeholder="160000"
                aria-invalid={Boolean(errors.openingCost)}
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="material-purchaseUnit"
              label="Satuan Beli (opsional)"
              error={errors.purchaseUnit}
              hint="Kalau belinya per sak, tulis: sak"
            >
              <Input
                id="material-purchaseUnit"
                name="purchaseUnit"
                defaultValue={material?.purchaseUnit ?? ""}
                placeholder="sak"
                aria-invalid={Boolean(errors.purchaseUnit)}
              />
            </Field>

            <Field
              id="material-purchaseSize"
              label="Isi Per Satuan Beli"
              error={errors.purchaseSize}
              hint={`Berapa ${material?.unit ?? "gram"} dalam satu satuan beli`}
            >
              <Input
                id="material-purchaseSize"
                name="purchaseSize"
                type="number"
                min={0}
                step="any"
                defaultValue={material?.purchaseSize ?? ""}
                placeholder="5000"
                aria-invalid={Boolean(errors.purchaseSize)}
              />
            </Field>
          </div>

          <Field
            id="material-expiresAt"
            label="Kedaluwarsa (opsional)"
            error={errors.expiresAt}
            hint="Satu tanggal per bahan, yang paling dekat. Diingatkan sebulan sebelumnya."
          >
            <Input
              id="material-expiresAt"
              name="expiresAt"
              type="date"
              defaultValue={
                material?.expiresAt ? dateInputValue(material.expiresAt) : ""
              }
              aria-invalid={Boolean(errors.expiresAt)}
            />
          </Field>

          <Field
            id="material-notes"
            label="Catatan (opsional)"
            error={errors.notes}
            hint="Merek, toko langganan, atau apa pun yang perlu diingat"
          >
            <Textarea
              id="material-notes"
              name="notes"
              rows={2}
              defaultValue={material?.notes ?? ""}
              placeholder="Beli di Tani Makmur, yang karung merah"
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton>
              {editing ? "Simpan Perubahan" : "Simpan Bahan"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
