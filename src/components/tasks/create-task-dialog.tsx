"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/common/native-select";
import { SubmitButton } from "@/components/common/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { createTask } from "@/server/actions/tasks";
import type { MemberOption } from "@/server/queries/users";

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  AGRONOMIST: "Agronomis",
  LOGISTICS: "Logistik",
  SALES: "Sales",
};

function todayInJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

export function CreateTaskDialog({
  seasonId,
  members,
  currentHst,
}: {
  seasonId: string;
  members: MemberOption[];
  currentHst: number;
}) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    const result = await createTask(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setOpen(false);
    toast.success("Tugas ditambahkan.");
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
          Tambah Tugas
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Tugas Baru</DialogTitle>
          <DialogDescription>
            Tugas melekat pada musim yang sedang dipilih di navbar.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="seasonId" value={seasonId} />

          <Field id="title" label="Judul Tugas" error={errors.title}>
            <Input
              id="title"
              name="title"
              required
              placeholder="Semprot fungisida"
              aria-invalid={Boolean(errors.title)}
            />
          </Field>

          <Field
            id="description"
            label="Deskripsi (opsional)"
            error={errors.description}
          >
            <Textarea id="description" name="description" rows={2} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="hst"
              label="HST Rencana (opsional)"
              error={errors.hst}
              hint={`Musim ini sekarang HST ${currentHst}`}
            >
              <Input
                id="hst"
                name="hst"
                type="number"
                min={0}
                placeholder={String(currentHst)}
                aria-invalid={Boolean(errors.hst)}
              />
            </Field>

            <Field id="dueDate" label="Jatuh Tempo" error={errors.dueDate}>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                required
                defaultValue={todayInJakarta()}
                aria-invalid={Boolean(errors.dueDate)}
              />
            </Field>
          </div>

          <Field id="status" label="Status" error={errors.status}>
            <NativeSelect
              id="status"
              name="status"
              defaultValue="TODO"
            >
              <option value="TODO">Belum dikerjakan</option>
              <option value="IN_PROGRESS">Dikerjakan</option>
              <option value="DONE">Selesai</option>
            </NativeSelect>
          </Field>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">
              Penugas (boleh lebih dari satu)
            </legend>
            {members.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Belum ada anggota terdaftar.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {members.map((member) => (
                  <label
                    key={member.id}
                    className="hover:bg-accent flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <Checkbox name="assigneeIds" value={member.id} />
                    <span className="min-w-0 truncate">
                      {member.name}
                      <span className="text-muted-foreground ml-1 text-xs">
                        {roleLabels[member.role] ?? member.role}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton>Simpan Tugas</SubmitButton>
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
    // content-start: a sibling Field carrying a hint is taller, and a stretched
    // grid would widen this one's gaps instead, pushing its control out of line.
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
