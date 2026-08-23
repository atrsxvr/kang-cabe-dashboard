"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { CHILI_GRADES, gradeLabels } from "@/lib/harvest";
import { createHarvestLoss } from "@/server/actions/population";
import type { MemberOption } from "@/server/queries/users";

/**
 * Chillies picked but never sold — rotted, spilled, given away.
 *
 * Without this the unsold figure is simply picked minus sold, and it grows a
 * little further from the actual crate every time something spoils.
 */
export function LossDialog({
  seasonId,
  members,
}: {
  seasonId: string;
  members: MemberOption[];
}) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    const result = await createHarvestLoss(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setOpen(false);
    toast.success("Susut tercatat.");
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
        <Button size="sm" variant="secondary">
          <Trash2 className="size-4" aria-hidden />
          Catat Susut
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat Susut</DialogTitle>
          <DialogDescription>
            Cabai yang sudah dipetik tapi nggak jadi terjual — busuk, tercecer.
            Biar sisa stoknya nggak melar dari kenyataan.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="seasonId" value={seasonId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="loss-grade" label="Mutu" error={errors.grade}>
              <NativeSelect id="loss-grade" name="grade" defaultValue="GOOD">
                {CHILI_GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {gradeLabels[grade]}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field id="loss-weight" label="Bobot (kg)" error={errors.weightKg}>
              <Input
                id="loss-weight"
                name="weightKg"
                inputMode="decimal"
                required
                placeholder="2"
                aria-invalid={Boolean(errors.weightKg)}
              />
            </Field>
          </div>

          <Field id="loss-date" label="Tanggal" error={errors.lostAt}>
            <Input
              id="loss-date"
              name="lostAt"
              type="date"
              required
              defaultValue={dateInputValue()}
              aria-invalid={Boolean(errors.lostAt)}
            />
          </Field>

          <Field id="loss-reason" label="Sebab (opsional)" error={errors.reason}>
            <Input
              id="loss-reason"
              name="reason"
              placeholder="Busuk, kelamaan nunggu pengepul"
              aria-invalid={Boolean(errors.reason)}
            />
          </Field>

          <Field
            id="loss-recordedBy"
            label="Dicatat oleh"
            error={errors.recordedById}
          >
            <NativeSelect
              id="loss-recordedBy"
              name="recordedById"
              defaultValue=""
            >
              <option value="">— nggak disebutkan —</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton>Simpan</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
