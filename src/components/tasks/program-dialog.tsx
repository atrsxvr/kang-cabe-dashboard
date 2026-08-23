"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { SubmitButton } from "@/components/common/submit-button";
import { phaseLabels } from "@/components/health/recipe-labels";
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
import { amountForVolume, formatAmount, parseAmount } from "@/lib/dose";
import { scheduleProgram } from "@/server/actions/program";
import type { RecipeRow } from "@/server/queries/recipes";
import type { MemberOption } from "@/server/queries/users";

/**
 * The mixing schedule is the one genuinely repetitive part of this job: every
 * three days from HST 30 to HST 90 is twenty identical tasks, and typing them
 * by hand is how half of them end up missing.
 */
export function ProgramDialog({
  seasonId,
  recipes,
  members,
  currentHst,
  defaultTankLitres,
}: {
  seasonId: string;
  recipes: RecipeRow[];
  members: MemberOption[];
  currentHst: number;
  defaultTankLitres: number;
}) {
  // Only routine mixes repeat on a schedule; a treatment answers a problem
  // that has not happened yet.
  const routine = recipes.filter((recipe) => recipe.kind === "ROUTINE");

  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recipeId, setRecipeId] = useState(routine[0]?.id ?? "");
  const [interval, setInterval] = useState("");
  const [volume, setVolume] = useState(String(defaultTankLitres));
  const [fromHst, setFromHst] = useState(String(currentHst));
  const [toHst, setToHst] = useState(String(currentHst + 30));
  const router = useRouter();

  const recipe = routine.find((item) => item.id === recipeId) ?? routine[0];

  const every = Number(interval) || recipe?.intervalDays || 7;
  const from = Number(fromHst);
  const to = Number(toHst);
  const litres = parseAmount(volume);

  const count =
    Number.isFinite(from) && Number.isFinite(to) && to >= from && every > 0
      ? Math.floor((to - from) / every) + 1
      : 0;

  async function onSubmit(formData: FormData) {
    const result = await scheduleProgram(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setOpen(false);
    toast.success(result.message ?? "Program dijadwalkan.");
    router.refresh();
  }

  if (routine.length === 0) return null;

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
          <CalendarPlus className="size-4" aria-hidden />
          Jadwalkan Program
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Jadwalkan Program Nutrisi</DialogTitle>
          <DialogDescription>
            Bikin tugas berulang dari satu racikan rutin. Takarannya disalin ke
            tiap tugas, persis kayak bikin manual.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="seasonId" value={seasonId} />
          <input type="hidden" name="intervalDays" value={every} />

          <Field id="program-recipe" label="Racikan" error={errors.recipeId}>
            <NativeSelect
              id="program-recipe"
              name="recipeId"
              value={recipe?.id ?? ""}
              onChange={(event) => {
                setRecipeId(event.target.value);
                setInterval("");
                const next = routine.find((r) => r.id === event.target.value);
                if (next) setVolume(String(next.basisVolumeL));
              }}
            >
              {routine.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.phase ? ` · ${phaseLabels[item.phase]}` : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="program-from" label="HST Mulai" error={errors.fromHst}>
              <Input
                id="program-from"
                name="fromHst"
                type="number"
                min={0}
                required
                value={fromHst}
                onChange={(event) => setFromHst(event.target.value)}
                aria-invalid={Boolean(errors.fromHst)}
              />
            </Field>

            <Field id="program-to" label="HST Selesai" error={errors.toHst}>
              <Input
                id="program-to"
                name="toHst"
                type="number"
                min={0}
                required
                value={toHst}
                onChange={(event) => setToHst(event.target.value)}
                aria-invalid={Boolean(errors.toHst)}
              />
            </Field>

            <Field id="program-interval" label="Tiap (hari)">
              <Input
                id="program-interval"
                type="number"
                min={1}
                value={interval}
                onChange={(event) => setInterval(event.target.value)}
                placeholder={String(recipe?.intervalDays ?? 7)}
              />
            </Field>
          </div>

          <Field id="program-volume" label="Volume tangki (liter)">
            <Input
              id="program-volume"
              name="volumeL"
              inputMode="decimal"
              required
              value={volume}
              onChange={(event) => setVolume(event.target.value)}
            />
          </Field>

          {recipe && litres > 0 ? (
            <div className="bg-muted/40 grid gap-1 rounded-md border p-3">
              <p className="text-sm font-medium">
                {count} tugas, tiap {every} hari
              </p>
              <ul className="text-muted-foreground grid gap-0.5 text-xs">
                {recipe.items.map((item) => (
                  <li key={item.id} className="tabular-nums">
                    {item.material.name}{" "}
                    <strong className="text-foreground">
                      {formatAmount(amountForVolume(item, litres))}{" "}
                      {item.material.unit}
                    </strong>{" "}
                    per tugas
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-xs">
                HST yang sudah punya tugas dari racikan ini dilewati, jadi aman
                dijalankan dua kali.
              </p>
            </div>
          ) : null}

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">
              Penugas (opsional)
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {members.map((member) => (
                <label
                  key={member.id}
                  className="hover:bg-accent flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <Checkbox name="assigneeIds" value={member.id} />
                  <span className="min-w-0 truncate">{member.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton>Jadwalkan {count} Tugas</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
