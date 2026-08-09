"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { dateInputValue, Field } from "@/components/common/form-field";
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
import { Textarea } from "@/components/ui/textarea";
import { createTask, updateTask } from "@/server/actions/tasks";
import type { TaskRow } from "@/server/queries/tasks";
import type { MemberOption } from "@/server/queries/users";

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  AGRONOMIST: "Agronomis",
  LOGISTICS: "Logistik",
  SALES: "Sales",
};

export function TaskDialog({
  seasonId,
  members,
  currentHst,
  task,
}: {
  seasonId: string;
  members: MemberOption[];
  currentHst: number;
  task?: TaskRow;
}) {
  const editing = Boolean(task);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const assigned = new Set(task?.assignees.map((a) => a.userId) ?? []);

  async function onSubmit(formData: FormData) {
    const result = editing
      ? await updateTask(formData)
      : await createTask(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setOpen(false);
    toast.success(editing ? "Tugas diperbarui." : "Tugas ditambahkan.");
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
            size="sm"
            aria-label={`Sunting ${task!.title}`}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" aria-hidden />
            Tambah Tugas
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Sunting Tugas" : "Tambah Tugas Baru"}</DialogTitle>
          <DialogDescription>
            Tugas melekat pada musim yang sedang dipilih di navbar.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="seasonId" value={seasonId} />
          {editing ? (
            <input type="hidden" name="taskId" value={task!.id} />
          ) : null}

          <Field id="title" label="Judul Tugas" error={errors.title}>
            <Input
              id="title"
              name="title"
              required
              defaultValue={task?.title}
              placeholder="Semprot fungisida"
              aria-invalid={Boolean(errors.title)}
            />
          </Field>

          <Field
            id="description"
            label="Deskripsi (opsional)"
            error={errors.description}
          >
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={task?.description ?? ""}
            />
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
                defaultValue={task?.hst ?? ""}
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
                defaultValue={dateInputValue(task?.dueDate)}
                aria-invalid={Boolean(errors.dueDate)}
              />
            </Field>
          </div>

          <Field id="status" label="Status" error={errors.status}>
            <NativeSelect
              id="status"
              name="status"
              defaultValue={task?.status ?? "TODO"}
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
                    <Checkbox
                      name="assigneeIds"
                      value={member.id}
                      defaultChecked={assigned.has(member.id)}
                    />
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
            <SubmitButton>
              {editing ? "Simpan Perubahan" : "Simpan Tugas"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
