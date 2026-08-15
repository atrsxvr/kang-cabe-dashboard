"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { dateInputValue, Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { SubmitButton } from "@/components/common/submit-button";
import { RecipePicker } from "@/components/health/recipe-picker";
import { MaterialPicker } from "@/components/tasks/material-picker";
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
import { amountToInput, formatAmount, parseAmount } from "@/lib/dose";
import { createTask, updateTask } from "@/server/actions/tasks";
import type { StockRow } from "@/server/queries/inventory";
import type { RecipeRow } from "@/server/queries/recipes";
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
  recipes,
  materials,
  task,
}: {
  seasonId: string;
  members: MemberOption[];
  currentHst: number;
  recipes: RecipeRow[];
  materials: StockRow[];
  task?: TaskRow;
}) {
  const editing = Boolean(task);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  // Controlled so the recipe picker can write into them.
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");

  // One list, whether a line came from a recipe or straight off the shelf.
  // Carried as a snapshot rather than a live lookup: the shed is deducted
  // against exactly what the form said.
  //
  // The amount is kept as typed text, not a number: clearing the box to retype
  // it would otherwise become NaN mid-keystroke and the row would look broken
  // while someone was still typing in it.
  const [used, setUsed] = useState<UsedRow[]>(
    (task?.materials ?? []).map(toRow),
  );

  // Only a label for where some of those lines came from. Nothing reads the
  // recipe back to work out amounts.
  const [recipe, setRecipe] = useState<{ id: string; volumeL: number } | null>(
    task?.recipeId
      ? { id: task.recipeId, volumeL: task.recipeVolumeL ?? 0 }
      : null,
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
    setUsed((task?.materials ?? []).map(toRow));
    setRecipe(
      task?.recipeId
        ? { id: task.recipeId, volumeL: task.recipeVolumeL ?? 0 }
        : null,
    );
  };

  const bad = used.find((row) => !isPositive(row.amount));

  async function onSubmit(formData: FormData) {
    // Caught here rather than at the server, which would only be able to say
    // "periksa kembali isian formulir" without pointing at the row.
    if (bad) {
      setErrors({
        materials: `Isi jumlah ${bad.name} dengan angka lebih dari 0.`,
      });
      toast.error("Ada jumlah bahan yang belum benar.");
      return;
    }

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
          <Button variant="ghost" size="sm" aria-label={`Edit ${task!.title}`}>
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
          <DialogTitle>
            {editing ? "Edit Tugas" : "Tambah Tugas Baru"}
          </DialogTitle>
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
              rows={recipe ? 6 : 2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          {used.length > 0 ? (
            <input
              type="hidden"
              name="materials"
              value={JSON.stringify(
                used.map(({ materialId, amount }) => ({
                  materialId,
                  amount: parseAmount(amount),
                })),
              )}
            />
          ) : null}

          {recipe ? (
            <>
              <input type="hidden" name="recipeId" value={recipe.id} />
              <input
                type="hidden"
                name="recipeVolumeL"
                value={recipe.volumeL}
              />
            </>
          ) : null}

          {used.length > 0 ? (
            <div className="bg-muted/40 grid gap-2 rounded-md border p-3">
              <p className="text-sm font-medium">
                Bahan yang dipakai
                {recipe ? ` · ${formatAmount(recipe.volumeL)} liter` : null}
              </p>

              <ul className="grid gap-1.5">
                {used.map((item) => (
                  <li
                    key={item.materialId}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>

                    {locked ? (
                      <span className="tabular-nums">
                        {item.amount} {item.unit}
                      </span>
                    ) : (
                      <>
                        <Input
                          value={item.amount}
                          onChange={(event) =>
                            setUsed((current) =>
                              current.map((row) =>
                                row.materialId === item.materialId
                                  ? { ...row, amount: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          inputMode="decimal"
                          className="h-7 w-20 text-xs"
                          aria-label={`Jumlah ${item.name}`}
                          aria-invalid={!isPositive(item.amount)}
                        />
                        <span className="text-muted-foreground w-12 shrink-0">
                          {item.unit}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0"
                          aria-label={`Hapus ${item.name}`}
                          onClick={() => {
                            setUsed((current) =>
                              current.filter(
                                (row) => row.materialId !== item.materialId,
                              ),
                            );
                            // The label only means anything while its lines
                            // are still here.
                            if (recipe && used.length === 1) setRecipe(null);
                          }}
                        >
                          <X className="size-3" aria-hidden />
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              {errors.materials ? (
                <p className="text-destructive text-xs" role="alert">
                  {errors.materials}
                </p>
              ) : null}

              <p className="text-muted-foreground text-xs">
                {locked
                  ? "Pemakaian sudah tercatat, jadi takarannya dikunci."
                  : "Stok baru berkurang kalau tugas ini ditandai selesai lalu ditekan Catat pemakaian."}
              </p>
            </div>
          ) : null}

          {locked ? null : (
            <>
              {recipe ? null : (
                <RecipePicker
                  recipes={recipes}
                  label="Pakai racikan dari Pustaka (opsional)"
                  onApply={(picked) => {
                    setRecipe({ id: picked.recipeId, volumeL: picked.volumeL });
                    setUsed((current) => {
                      const fromRecipe = picked.materials.map((item) =>
                        toRow({
                          ...item,
                          ...(lookup(
                            recipes,
                            picked.recipeId,
                            item.materialId,
                          ) ?? { name: item.materialId, unit: "" }),
                        }),
                      );

                      // A recipe wins for anything already on the list: its
                      // dose is the considered number, the hand-typed one was
                      // a guess.
                      const ids = new Set(fromRecipe.map((i) => i.materialId));
                      return [
                        ...current.filter((row) => !ids.has(row.materialId)),
                        ...fromRecipe,
                      ];
                    });
                    // The title is the person's own wording if they already
                    // typed one; the takaran belongs in the description either
                    // way.
                    setTitle((current) =>
                      current.trim() ? current : picked.name,
                    );
                    setDescription((current) =>
                      current.trim()
                        ? `${current.trim()}\n\n${picked.text}`
                        : picked.text,
                    );
                  }}
                />
              )}

              <MaterialPicker
                materials={materials}
                exclude={used.map((item) => item.materialId)}
                onAdd={(picked) =>
                  setUsed((current) => [...current, toRow(picked)])
                }
              />
            </>
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

type UsedRow = {
  materialId: string;
  name: string;
  unit: string;
  /** As typed, so a cleared or half-typed box stays what the person sees. */
  amount: string;
};

function toRow(item: {
  materialId: string;
  name: string;
  unit: string;
  amount: number;
}): UsedRow {
  // Deliberately not formatAmount: that groups thousands the Indonesian way,
  // so 1000 renders as "1.000" and reads back as 1. String() never groups, and
  // swapping the decimal point for a comma keeps it the way it would be typed.
  return { ...item, amount: amountToInput(item.amount) };
}

function isPositive(amount: string): boolean {
  const value = parseAmount(amount);
  return Number.isFinite(value) && value > 0;
}

/** The picker hands back ids; the summary list needs names and units. */
function lookup(recipes: RecipeRow[], recipeId: string, materialId: string) {
  const item = recipes
    .find((recipe) => recipe.id === recipeId)
    ?.items.find((i) => i.material.id === materialId);

  return item ? { name: item.material.name, unit: item.material.unit } : null;
}
