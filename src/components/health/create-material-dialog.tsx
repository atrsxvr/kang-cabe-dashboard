"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/common/native-select";
import { SubmitButton } from "@/components/common/submit-button";
import { materialCategoryLabels } from "@/components/health/recipe-labels";
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
import { createMaterial } from "@/server/actions/recipes";

export function CreateMaterialDialog() {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    const result = await createMaterial(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setOpen(false);
    toast.success("Bahan ditambahkan.");
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
        <Button size="sm" variant="secondary">
          <FlaskConical className="size-4" aria-hidden />
          Tambah Bahan
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Bahan</DialogTitle>
          <DialogDescription>
            Bahan dipakai bersama oleh semua racikan — dan nanti oleh modul
            Inventaris untuk melacak stok.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="material-name">Nama Bahan</Label>
            <Input
              id="material-name"
              name="name"
              required
              placeholder="NPK 16-16-16"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? (
              <p className="text-destructive text-xs" role="alert">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid content-start gap-2">
              <Label htmlFor="material-unit">Satuan</Label>
              <NativeSelect id="material-unit" name="unit" defaultValue="gram">
                <option value="gram">gram</option>
                <option value="ml">ml</option>
                <option value="kg">kg</option>
                <option value="liter">liter</option>
              </NativeSelect>
              {errors.unit ? (
                <p className="text-destructive text-xs" role="alert">
                  {errors.unit}
                </p>
              ) : null}
            </div>

            <div className="grid content-start gap-2">
              <Label htmlFor="material-category">Kategori</Label>
              <NativeSelect
                id="material-category"
                name="category"
                defaultValue="FERTILIZER"
              >
                {Object.entries(materialCategoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton>Simpan Bahan</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
