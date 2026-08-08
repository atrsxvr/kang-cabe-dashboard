"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SEASON_PARAM } from "@/lib/season-param";
import { createSeason } from "@/server/actions/seasons";

const statusOptions = [
  { value: "PLANNING", label: "Perencanaan" },
  { value: "ACTIVE", label: "Berjalan" },
  { value: "HARVESTING", label: "Panen" },
  { value: "COMPLETED", label: "Selesai" },
];

function todayInJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

export function CreateSeasonDialog() {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    const result = await createSeason(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setOpen(false);
    toast.success("Musim tanam dibuat.");

    // Switch context to the season just created — that is almost always what
    // the user wants next, and it makes the new season visible in the navbar.
    if (result.seasonId) {
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
        <Button size="sm">
          <Plus className="size-4" aria-hidden />
          Tambah Musim
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Musim Tanam Baru</DialogTitle>
          <DialogDescription>
            Tanggal tanam menjadi HST 0 untuk seluruh tugas di musim ini.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <Field id="name" label="Nama Musim" error={errors.name}>
            <Input
              id="name"
              name="name"
              required
              placeholder="Musim Tanam 2"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field id="variety" label="Varietas Benih" error={errors.variety}>
            <Input
              id="variety"
              name="variety"
              required
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
                defaultValue={1000}
                aria-invalid={Boolean(errors.plantCount)}
              />
            </Field>

            <Field id="startDate" label="Tanggal Tanam" error={errors.startDate}>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
                defaultValue={todayInJakarta()}
                aria-invalid={Boolean(errors.startDate)}
              />
            </Field>
          </div>

          <Field id="status" label="Status" error={errors.status}>
            {/* Native select: inside a form action, its value is submitted
                without extra client wiring. */}
            <NativeSelect
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

          <Field id="notes" label="Catatan (opsional)" error={errors.notes}>
            <Textarea id="notes" name="notes" rows={2} />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton>Simpan Musim</SubmitButton>
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
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
