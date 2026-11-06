"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { dateInputValue, Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { SubmitButton } from "@/components/common/submit-button";
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
import { amountToInput } from "@/lib/dose";
import { SEASON_PARAM } from "@/lib/season-param";
import { createSeason, updateSeason } from "@/server/actions/seasons";
import type { GardenOption } from "@/server/queries/gardens";
import type { SeasonRow } from "@/server/queries/seasons";

const statusOptions = [
  { value: "PLANNING", label: "Perencanaan" },
  { value: "ACTIVE", label: "Berjalan" },
  { value: "HARVESTING", label: "Panen" },
  // Not Selesai and not Arsip: a new season reaches the first only through
  // Tutup Musim's checklist and the second through Arsipkan on its row.
];

/**
 * One dialog for creating and editing. The fields and their rules are
 * identical, and keeping two copies is how a validation rule ends up applying
 * to new records but not to corrections.
 */
export function SeasonDialog({
  season,
  gardens,
}: {
  season?: SeasonRow;
  /** Latest-planted plot first; a new season opens on it. */
  gardens: GardenOption[];
}) {
  const editing = Boolean(season);
  const [open, setOpen] = useState(false);
  const initialGarden = season?.gardenId ?? gardens[0]?.id ?? "";
  const tanksOf = (gardenId: string) => gardens.find((garden) => garden.id === gardenId);
  const [gardenId, setGardenId] = useState(initialGarden);
  const [spray, setSpray] = useState(
    amountToInput(season?.sprayTankLitres ?? tanksOf(initialGarden)?.sprayTankLitres ?? 16)
  );
  const [kocor, setKocor] = useState(
    amountToInput(season?.kocorTankLitres ?? tanksOf(initialGarden)?.kocorTankLitres ?? 20)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    const result = editing
      ? await updateSeason(formData)
      : await createSeason(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setOpen(false);
    toast.success(editing ? "Musim diperbarui." : "Musim tanam dibuat.");

    // A new season becomes the context you are almost certainly about to work
    // in; an edited one is already the context you are in.
    if (!editing && result.seasonId) {
      router.push(`/seasons?${SEASON_PARAM}=${result.seasonId}`);
    }
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
            size="icon"
            className="size-8"
            aria-label={`Edit ${season!.name}`}
            title={`Edit ${season!.name}`}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" aria-hidden />
            Tambah Musim
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Musim Tanam" : "Tambah Musim Tanam Baru"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Mengubah tanggal tanam menggeser HST seluruh tugas dan temuan musim ini."
              : "Tanggal tanam menjadi HST 0 untuk seluruh tugas di musim ini."}
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          {editing ? (
            <input type="hidden" name="seasonId" value={season!.id} />
          ) : null}

          <Field id="name" label="Nama Musim" error={errors.name}>
            <Input
              id="name"
              name="name"
              required
              defaultValue={season?.name}
              placeholder="Tulis nama musim"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field id="variety" label="Varietas Benih" error={errors.variety}>
            <Input
              id="variety"
              name="variety"
              required
              defaultValue={season?.variety}
              placeholder="Tulis varietas benihnya"
              aria-invalid={Boolean(errors.variety)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="plantCount"
              label="Jumlah Populasi"
              error={errors.plantCount}
            >
              <Input
                id="plantCount"
                name="plantCount"
                type="number"
                min={1}
                required
                defaultValue={season?.plantCount ?? ""}
                aria-invalid={Boolean(errors.plantCount)}
              />
            </Field>

            <Field
              id="startDate"
              label="Tanggal Tanam"
              error={errors.startDate}
            >
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
                defaultValue={dateInputValue(season?.startDate)}
                aria-invalid={Boolean(errors.startDate)}
              />
            </Field>
          </div>

          {/* Kosong itu jawaban yang sah: tanpa angka ini panduan harga jual
              memilih diam daripada mengarang lantai. */}
          <Field
            id="projectedHarvestKg"
            label="Proyeksi Panen (kg)"
            error={errors.projectedHarvestKg}
            hint="Perkiraan total cabai bagus semusim. Dipakai buat menghitung modal per kilo, yang jadi patokan harga jual. Boleh dikosongkan."
          >
            <Input
              id="projectedHarvestKg"
              name="projectedHarvestKg"
              inputMode="decimal"
              defaultValue={
                season?.projectedHarvestKg != null
                  ? amountToInput(season.projectedHarvestKg)
                  : ""
              }
              aria-invalid={Boolean(errors.projectedHarvestKg)}
            />
          </Field>

          <Field id="gardenId" label="Lahan" error={errors.gardenId}>
            <NativeSelect
              id="gardenId"
              name="gardenId"
              required
              value={gardenId}
              onChange={(event) => {
                const next = event.target.value;
                setGardenId(next);
                // A new season on another plot takes that plot's last tanks;
                // an existing one keeps what was typed for it.
                const tanks = tanksOf(next);
                if (!editing && tanks) {
                  setSpray(amountToInput(tanks.sprayTankLitres));
                  setKocor(amountToInput(tanks.kocorTankLitres));
                }
              }}
              aria-invalid={Boolean(errors.gardenId)}
            >
              {gardens.map((garden) => (
                <option key={garden.id} value={garden.id}>
                  {garden.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {/* Per season: the two plots are not the same size, and a mix is
              made up in whichever tank that plot uses. */}
          <div className="grid grid-cols-2 gap-4">
            <Field
              id="sprayTankLitres"
              label="Tangki spray (L)"
              error={errors.sprayTankLitres}
            >
              <Input
                id="sprayTankLitres"
                name="sprayTankLitres"
                inputMode="decimal"
                required
                value={spray}
                onChange={(event) => setSpray(event.target.value)}
                aria-invalid={Boolean(errors.sprayTankLitres)}
              />
            </Field>
            <Field
              id="kocorTankLitres"
              label="Tangki kocor (L)"
              error={errors.kocorTankLitres}
            >
              <Input
                id="kocorTankLitres"
                name="kocorTankLitres"
                inputMode="decimal"
                required
                value={kocor}
                onChange={(event) => setKocor(event.target.value)}
                aria-invalid={Boolean(errors.kocorTankLitres)}
              />
            </Field>
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">
            Volume acuan racikan dan takaran di Jadwalkan Program mengikuti
            tangki musim ini.
          </p>

          {/* Only when creating. An existing season's status moves through
              the buttons on its row, and Selesai only through Tutup Musim's
              checklist — a select here would be a way around it. */}
          {editing ? null : (
            <Field id="status" label="Status" error={errors.status}>
              <NativeSelect
                required
                id="status"
                name="status"
                defaultValue="PLANNING"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}

          <Field id="notes" label="Catatan (opsional)" error={errors.notes}>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={season?.notes ?? ""}
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
              {editing ? "Simpan Perubahan" : "Simpan Musim"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
