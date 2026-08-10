"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { dateInputValue, Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { SubmitButton } from "@/components/common/submit-button";
import { RecipePicker } from "@/components/health/recipe-picker";
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
import { formatAmount } from "@/lib/dose";
import { createTask, updateTask } from "@/server/actions/tasks";
import type { RecipeRow } from "@/server/queries/recipes";
import type { TaskMaterialView, TaskRow } from "@/server/queries/tasks";
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
  recipes,
  task,
}: {
  seasonId: string;
  members: MemberOption[];
  currentHst: number;
  recipes: RecipeRow[];
  task?: TaskRow;
}) {
  const editing = Boolean(task);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  // Controlled so the recipe picker can write into them.
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");

  // The amounts a recipe was written at, carried as a snapshot rather than a
  // live lookup: the shed is deducted against exactly what the form said.
  const [mix, setMix] = useState<{
    recipeId: string;
    volumeL: number;
    materials: TaskMaterialView[];
  } | null>(
    task?.recipeId
      ? {
          recipeId: task.recipeId,
          volumeL: task.recipeVolumeL ?? 0,
          materials: task.materials,
        }
      : null
  );

  // Once the shed has been debited, the amounts are history, not a plan.
  const locked = Boolean(task?.usageRecordedAt);
  const assigned = new Set(task?.assignees.map((a) => a.userId) ?? []);

  // These fields are controlled, so React's post-action form reset does not
  // reach them. Closing has to clear them by hand, or the next "Tambah Tugas"
  // opens onto the task that was just saved.
  const reset = () => {
    setErrors({});
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setMix(
      task?.recipeId
        ? {
            recipeId: task.recipeId,
            volumeL: task.recipeVolumeL ?? 0,
            materials: task.materials,
          }
        : null
    );
  };

  async function onSubmit(formData: FormData) {
    const result = editing
      ? await updateTask(formData)
      : await createTask(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setOpen(false);
    reset();
    toast.success(editing ? "Tugas diperbarui." : "Tugas ditambahkan.");
    router.refresh();
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
        {editing ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Edit ${task!.title}`}
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
          <DialogTitle>{editing ? "Edit Tugas" : "Tambah Tugas Baru"}</DialogTitle>
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
              value={title}
              onChange={(event) => setTitle(event.target.value)}
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
              rows={mix ? 6 : 2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          {mix ? (
            <>
              <input type="hidden" name="recipeId" value={mix.recipeId} />
              <input
                type="hidden"
                name="recipeVolumeL"
                value={mix.volumeL}
              />
              <input
                type="hidden"
                name="materials"
                value={JSON.stringify(
                  mix.materials.map(({ materialId, amount }) => ({
                    materialId,
                    amount,
                  }))
                )}
              />
            </>
          ) : null}

          {mix ? (
            <div className="bg-muted/40 grid gap-2 rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">
                  Bahan yang dipakai · {formatAmount(mix.volumeL)} liter
                </p>
                {locked ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMix(null)}
                  >
                    <X className="size-4" aria-hidden />
                    Lepas
                  </Button>
                )}
              </div>
              <ul className="text-muted-foreground grid gap-0.5 text-xs">
                {mix.materials.map((item) => (
                  <li key={item.materialId} className="tabular-nums">
                    {item.name}{" "}
                    <strong className="text-foreground">
                      {formatAmount(item.amount)} {item.unit}
                    </strong>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-xs">
                {locked
                  ? "Pemakaian sudah tercatat, jadi takarannya dikunci."
                  : "Stok baru berkurang setelah tugas ini ditandai selesai."}
              </p>
            </div>
          ) : (
            <RecipePicker
              recipes={recipes}
              label="Pakai racikan dari Pustaka (opsional)"
              onApply={(picked) => {
                setMix({
                  recipeId: picked.recipeId,
                  volumeL: picked.volumeL,
                  materials: picked.materials.map((item) => ({
                    ...item,
                    ...(lookup(recipes, picked.recipeId, item.materialId) ?? {
                      name: item.materialId,
                      unit: "",
                    }),
                  })),
                });
                // The title is the person's own wording if they already typed
                // one; the takaran belongs in the description either way.
                setTitle((current) => (current.trim() ? current : picked.name));
                setDescription((current) =>
                  current.trim() ? `${current.trim()}\n\n${picked.text}` : picked.text
                );
              }}
            />
          )}

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
              onClick={() => {
                setOpen(false);
                reset();
              }}
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

/** The picker hands back ids; the summary list needs names and units. */
function lookup(recipes: RecipeRow[], recipeId: string, materialId: string) {
  const item = recipes
    .find((recipe) => recipe.id === recipeId)
    ?.items.find((i) => i.material.id === materialId);

  return item ? { name: item.material.name, unit: item.material.unit } : null;
}
