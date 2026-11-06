"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/common/form-field";
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
import { createGarden, updateGarden } from "@/server/actions/gardens";
import type { GardenRow } from "@/server/queries/gardens";

/**
 * One lahan: where it is, and which BMKG village code feeds the weather card
 * for every season planted on it.
 */
export function GardenDialog({ garden }: { garden?: GardenRow }) {
  const editing = Boolean(garden);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    const result = editing ? await updateGarden(formData) : await createGarden(formData);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }
    setErrors({});
    setOpen(false);
    toast.success(editing ? "Lahan diperbarui." : "Lahan ditambahkan.");
    router.refresh();
  }

  const id = (name: string) => `garden-${garden?.id ?? "baru"}-${name}`;

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
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label={`Edit ${garden!.name}`}
            title={`Edit ${garden!.name}`}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button size="sm" variant="secondary">
            <Plus className="size-4" aria-hidden />
            Tambah Lahan
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Lahan" : "Tambah Lahan"}</DialogTitle>
          <DialogDescription>
            Musim yang ditanam di lahan ini memakai lokasi dan cuacanya.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          {garden ? <input type="hidden" name="gardenId" value={garden.id} /> : null}

          <Field id={id("name")} label="Nama Lahan" error={errors.name}>
            <Input
              id={id("name")}
              name="name"
              required
              defaultValue={garden?.name ?? ""}
              placeholder="Tulis nama lahan"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field
            id={id("locationName")}
            label="Lokasi (opsional)"
            error={errors.locationName}
            hint="Desa dan kabupaten, misalnya Cisarua, Bogor."
          >
            <Input
              id={id("locationName")}
              name="locationName"
              defaultValue={garden?.locationName ?? ""}
              aria-invalid={Boolean(errors.locationName)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field id={id("latitude")} label="Lintang (opsional)" error={errors.latitude}>
              <Input
                id={id("latitude")}
                name="latitude"
                inputMode="decimal"
                defaultValue={garden?.latitude ?? ""}
                aria-invalid={Boolean(errors.latitude)}
              />
            </Field>
            <Field id={id("longitude")} label="Bujur (opsional)" error={errors.longitude}>
              <Input
                id={id("longitude")}
                name="longitude"
                inputMode="decimal"
                defaultValue={garden?.longitude ?? ""}
                aria-invalid={Boolean(errors.longitude)}
              />
            </Field>
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">
            Ambil dari Google Maps: klik kanan titik lahannya — angka pertama
            lintang, kedua bujur. Dipakai memeriksa kode wilayah di bawah
            benar-benar menunjuk ke lahan ini.
          </p>

          <Field
            id={id("bmkgAdm4")}
            label="Kode Wilayah BMKG (opsional)"
            error={errors.bmkgAdm4}
            hint="Untuk kartu cuaca. Kode kelurahan dari BMKG, empat bagian dipisah titik (dua, dua, dua, empat angka). Kalau keliru, kartunya menyebut nama desa yang asing dan jaraknya dari lahan."
          >
            <Input
              id={id("bmkgAdm4")}
              name="bmkgAdm4"
              inputMode="decimal"
              defaultValue={garden?.bmkgAdm4 ?? ""}
              aria-invalid={Boolean(errors.bmkgAdm4)}
            />
          </Field>

          <DialogFooter>
            <SubmitButton>{editing ? "Simpan Perubahan" : "Simpan Lahan"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
