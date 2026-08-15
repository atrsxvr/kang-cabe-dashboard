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
import { parseAmount } from "@/lib/dose";
import { formatKg, gradeLabels } from "@/lib/harvest";
import { createHarvest, updateHarvest } from "@/server/actions/harvest";
import type { HarvestRow } from "@/server/queries/harvest";
import type { MemberOption } from "@/server/queries/users";

/**
 * One picking. The total is shown while typing but never sent — it is the sum
 * of the two grades, and a stored total is the second source that eventually
 * disagrees with them.
 */
export function HarvestDialog({
  seasonId,
  members,
  harvest,
}: {
  seasonId: string;
  members: MemberOption[];
  harvest?: HarvestRow;
}) {
  const editing = Boolean(harvest);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [good, setGood] = useState(harvest ? String(harvest.goodKg) : "");
  const [reject, setReject] = useState(harvest ? String(harvest.rejectKg) : "");
  const router = useRouter();

  const total = kgOf(good) + kgOf(reject);

  const reset = () => {
    setErrors({});
    setGood(harvest ? String(harvest.goodKg) : "");
    setReject(harvest ? String(harvest.rejectKg) : "");
  };

  async function onSubmit(formData: FormData) {
    const result = editing
      ? await updateHarvest(formData)
      : await createHarvest(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setOpen(false);
    reset();
    toast.success(editing ? "Panen diperbarui." : "Panen tercatat.");
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
            size="icon"
            className="size-8"
            aria-label="Edit panen"
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" aria-hidden />
            Catat Panen
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Panen" : "Catat Panen"}</DialogTitle>
          <DialogDescription>
            Isi bobot hasil sortir. Afkir tetap dicatat — dia tetap dijual, cuma
            lebih murah.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="seasonId" value={seasonId} />
          {editing ? (
            <input type="hidden" name="harvestId" value={harvest!.id} />
          ) : null}

          <Field
            id="harvestDate"
            label="Tanggal Panen"
            error={errors.harvestDate}
          >
            <Input
              id="harvestDate"
              name="harvestDate"
              type="date"
              required
              defaultValue={dateInputValue(harvest?.harvestDate)}
              aria-invalid={Boolean(errors.harvestDate)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="goodKg"
              label={`${gradeLabels.GOOD} (kg)`}
              error={errors.goodKg}
            >
              <Input
                id="goodKg"
                name="goodKg"
                inputMode="decimal"
                value={good}
                onChange={(event) => setGood(event.target.value)}
                placeholder="0"
                aria-invalid={Boolean(errors.goodKg)}
              />
            </Field>

            <Field
              id="rejectKg"
              label={`${gradeLabels.REJECT} (kg)`}
              error={errors.rejectKg}
            >
              <Input
                id="rejectKg"
                name="rejectKg"
                inputMode="decimal"
                value={reject}
                onChange={(event) => setReject(event.target.value)}
                placeholder="0"
                aria-invalid={Boolean(errors.rejectKg)}
              />
            </Field>
          </div>

          <p className="text-muted-foreground text-sm">
            Total panen kali ini{" "}
            <strong className="text-foreground tabular-nums">
              {formatKg(total)}
            </strong>
          </p>

          <Field
            id="recordedById"
            label="Dicatat oleh"
            error={errors.recordedById}
          >
            <NativeSelect
              id="recordedById"
              name="recordedById"
              defaultValue={harvest?.recordedBy?.id ?? ""}
            >
              <option value="">— nggak disebutkan —</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            id="harvest-notes"
            label="Catatan (opsional)"
            error={errors.notes}
          >
            <Textarea
              id="harvest-notes"
              name="notes"
              rows={2}
              defaultValue={harvest?.notes ?? ""}
              placeholder="Petik pagi, blok A"
            />
          </Field>

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
              {editing ? "Simpan Perubahan" : "Simpan Panen"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Blank or half-typed means nothing yet, not NaN. */
function kgOf(input: string): number {
  const value = parseAmount(input);
  return Number.isFinite(value) ? value : 0;
}
