"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/common/native-select";
import { SubmitButton } from "@/components/common/submit-button";
import {
  kindLabels,
  methodLabels,
  phaseLabels,
} from "@/components/health/recipe-labels";
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
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_TANK_LITRES } from "@/lib/dose";
import { createRecipe } from "@/server/actions/recipes";
import type { MaterialRow } from "@/server/queries/recipes";

export function CreateRecipeDialog({
  materials,
}: {
  materials: MaterialRow[];
}) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [kind, setKind] = useState("ROUTINE");
  const [rows, setRows] = useState([0]);
  const router = useRouter();

  const reset = () => {
    setErrors({});
    setKind("ROUTINE");
    setRows([0]);
  };

  async function onSubmit(formData: FormData) {
    const result = await createRecipe(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    reset();
    setOpen(false);
    toast.success("Racikan disimpan.");
    router.refresh();
  }

  const close = () => {
    setOpen(false);
    reset();
  };

  if (materials.length === 0) {
    return (
      <Button size="sm" disabled title="Tambahkan bahan terlebih dahulu">
        <Plus className="size-4" aria-hidden />
        Tambah Racikan
      </Button>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" aria-hidden />
          Tambah Racikan
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tambah Racikan</DialogTitle>
          <DialogDescription>
            Takaran diisi per liter. Volume acuan hanya menentukan angka yang
            ditampilkan pertama kali.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <Field id="name" label="Nama Racikan" error={errors.name}>
            <Input
              id="name"
              name="name"
              required
              placeholder="Kocor NPK fase produksi"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="kind" label="Jenis" error={errors.kind}>
              <NativeSelect
                id="kind"
                name="kind"
                value={kind}
                onChange={(event) => setKind(event.target.value)}
              >
                {Object.entries(kindLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field id="method" label="Cara Aplikasi" error={errors.method}>
              <NativeSelect id="method" name="method" defaultValue="SEMPROT">
                {Object.entries(methodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          {/* One or the other: a routine recipe belongs to a phase, a treatment
              belongs to a problem. Showing both invites filling in neither. */}
          {kind === "ROUTINE" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="phase" label="Fase" error={errors.phase}>
                <NativeSelect id="phase" name="phase" defaultValue="PRODUCTION">
                  {Object.entries(phaseLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field
                id="intervalDays"
                label="Ulangi tiap (hari)"
                error={errors.intervalDays}
                hint="Kosongkan kalau sekali jalan"
              >
                <Input
                  id="intervalDays"
                  name="intervalDays"
                  type="number"
                  min={1}
                  placeholder="10"
                />
              </Field>
            </div>
          ) : (
            <Field
              id="targetIssue"
              label="Masalah yang disasar"
              error={errors.targetIssue}
            >
              <Input
                id="targetIssue"
                name="targetIssue"
                placeholder="Antraknosa"
                aria-invalid={Boolean(errors.targetIssue)}
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="basisVolumeL"
              label="Volume acuan (liter)"
              error={errors.basisVolumeL}
              hint="Ukuran tangki yang biasa dipakai"
            >
              <Input
                id="basisVolumeL"
                name="basisVolumeL"
                type="number"
                min={1}
                step="any"
                required
                defaultValue={DEFAULT_TANK_LITRES}
                aria-invalid={Boolean(errors.basisVolumeL)}
              />
            </Field>

            <Field
              id="preHarvestIntervalDays"
              label="Masa tunggu panen (hari)"
              error={errors.preHarvestIntervalDays}
              hint="Wajib untuk pestisida"
            >
              <Input
                id="preHarvestIntervalDays"
                name="preHarvestIntervalDays"
                type="number"
                min={0}
                placeholder="7"
              />
            </Field>
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">
              Bahan &amp; takaran per liter
            </legend>
            {errors.items ? (
              <p className="text-destructive text-xs" role="alert">
                {errors.items}
              </p>
            ) : null}

            <div className="grid gap-2">
              {rows.map((row, index) => (
                <div key={row} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor={`materialId-${row}`}
                      className="sr-only"
                    >{`Bahan ${index + 1}`}</Label>
                    <NativeSelect id={`materialId-${row}`} name="materialId">
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name} ({material.unit})
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="w-28">
                    <Label
                      htmlFor={`amountPerLiter-${row}`}
                      className="sr-only"
                    >{`Takaran per liter ${index + 1}`}</Label>
                    <Input
                      id={`amountPerLiter-${row}`}
                      name="amountPerLiter"
                      type="number"
                      min={0}
                      step="any"
                      required
                      placeholder="per liter"
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={rows.length === 1}
                    aria-label={`Hapus bahan ${index + 1}`}
                    onClick={() => setRows((r) => r.filter((x) => x !== row))}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="justify-self-start"
              onClick={() => setRows((r) => [...r, Math.max(...r) + 1])}
            >
              <Plus className="size-4" aria-hidden />
              Tambah bahan
            </Button>
          </fieldset>

          <Field id="notes" label="Catatan (opsional)" error={errors.notes}>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Aplikasi pagi hari, hindari saat akan hujan"
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={close}>
              Batal
            </Button>
            <SubmitButton>Simpan Racikan</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
