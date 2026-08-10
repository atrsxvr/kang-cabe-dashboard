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
import { SEASON_PARAM } from "@/lib/season-param";
import { createSeason, updateSeason } from "@/server/actions/seasons";
import type { SeasonRow } from "@/server/queries/seasons";

const statusOptions = [
  { value: "PLANNING", label: "Perencanaan" },
  { value: "ACTIVE", label: "Berjalan" },
  { value: "HARVESTING", label: "Panen" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "ARCHIVED", label: "Arsip" },
];

/**
 * One dialog for creating and editing. The fields and their rules are
 * identical, and keeping two copies is how a validation rule ends up applying
 * to new records but not to corrections.
 */
export function SeasonDialog({ season }: { season?: SeasonRow }) {
  const editing = Boolean(season);
  const [open, setOpen] = useState(false);
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
          <Button variant="ghost" size="sm" aria-label={`Edit ${season!.name}`}>
            <Pencil className="size-4" aria-hidden />
            Edit
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
              placeholder="Musim Tanam 2"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field id="variety" label="Varietas Benih" error={errors.variety}>
            <Input
              id="variety"
              name="variety"
              required
              defaultValue={season?.variety}
              placeholder="Rawit Ori 212"
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
                defaultValue={season?.plantCount ?? 1000}
                aria-invalid={Boolean(errors.plantCount)}
              />
            </Field>

            <Field id="startDate" label="Tanggal Tanam" error={errors.startDate}>
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

          <Field id="status" label="Status" error={errors.status}>
            <NativeSelect
              id="status"
              name="status"
              defaultValue={season?.status ?? "PLANNING"}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

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
