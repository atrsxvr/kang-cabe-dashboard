"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Sprout } from "lucide-react";
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
import { formatDate } from "@/lib/hst";
import {
  createPlantEvent,
  updatePlantEvent,
} from "@/server/actions/population";
import type { FindingRow } from "@/server/queries/findings";
import type { PlantEventRow } from "@/server/queries/harvest";
import type { MemberOption } from "@/server/queries/users";

/**
 * A change in how many plants are standing.
 *
 * Replanting is offered but rarely used past the first few weeks: a seedling
 * put in late never catches the rest, so a gap that opens in a grown crop
 * stays a gap. That is exactly why the deaths are worth logging — nothing
 * fills them back in.
 */
export function PlantEventDialog({
  seasonId,
  members,
  findings,
  event,
}: {
  seasonId: string;
  members: MemberOption[];
  /** Temuan musim ini, buat menjelaskan sebab kematian. */
  findings: FindingRow[];
  event?: PlantEventRow;
}) {
  const editing = Boolean(event);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [type, setType] = useState<string>(event?.type ?? "DIED");
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    const result = editing
      ? await updatePlantEvent(formData)
      : await createPlantEvent(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setOpen(false);
    toast.success(editing ? "Catatan diperbarui." : "Catatan tersimpan.");
    router.refresh();
  }

  const dying = type === "DIED";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setErrors({});
          setType(event?.type ?? "DIED");
        }
      }}
    >
      <DialogTrigger asChild>
        {editing ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Edit catatan populasi"
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <Sprout className="size-4" aria-hidden />
            Catat Populasi
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Catatan Populasi" : "Catat Mati / Sulam"}
          </DialogTitle>
          <DialogDescription>
            Berapa pokok yang mati atau disulam. Populasi sekarang dihitung dari
            catatan ini, bukan diketik ulang.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="seasonId" value={seasonId} />
          {editing ? (
            <input type="hidden" name="eventId" value={event!.id} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="plant-type" label="Kejadian" error={errors.type}>
              <NativeSelect
                id="plant-type"
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="DIED">Mati</option>
                <option value="REPLANTED">Sulam</option>
              </NativeSelect>
            </Field>

            <Field id="plant-count" label="Berapa pokok" error={errors.count}>
              <Input
                id="plant-count"
                name="count"
                type="number"
                min={1}
                required
                defaultValue={event?.count ?? ""}
                placeholder="5"
                aria-invalid={Boolean(errors.count)}
              />
            </Field>
          </div>

          <Field id="plant-date" label="Tanggal" error={errors.eventDate}>
            <Input
              id="plant-date"
              name="eventDate"
              type="date"
              required
              defaultValue={dateInputValue(event?.eventDate)}
              aria-invalid={Boolean(errors.eventDate)}
            />
          </Field>

          {dying ? (
            <>
              <Field id="plant-cause" label="Sebab (opsional)" error={errors.cause}>
                <Input
                  id="plant-cause"
                  name="cause"
                  defaultValue={event?.cause ?? ""}
                  placeholder="Layu fusarium"
                  aria-invalid={Boolean(errors.cause)}
                />
              </Field>

              {findings.length > 0 ? (
                <Field
                  id="plant-finding"
                  label="Dari temuan mana (opsional)"
                  error={errors.findingId}
                  hint="Menautkannya bikin ceritanya nyambung: mati karena temuan yang mana"
                >
                  <NativeSelect
                    id="plant-finding"
                    name="findingId"
                    defaultValue={event?.finding?.id ?? ""}
                  >
                    <option value="">— nggak ditautkan —</option>
                    {findings.map((finding) => (
                      <option key={finding.id} value={finding.id}>
                        HST {finding.hst} · {finding.symptoms.slice(0, 60)}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground text-xs">
              Sulam cuma nambah jumlah pokok. Biayanya nggak dicatat lagi di
              sini — bibitnya sudah dibeli di awal musim, jadi kalau dicatat
              ulang bakal kehitung dua kali.
            </p>
          )}

          <Field
            id="plant-recordedBy"
            label="Dicatat oleh"
            error={errors.recordedById}
          >
            <NativeSelect
              id="plant-recordedBy"
              name="recordedById"
              defaultValue={event?.recordedBy?.id ?? ""}
            >
              <option value="">— nggak disebutkan —</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field id="plant-note" label="Catatan (opsional)" error={errors.note}>
            <Input
              id="plant-note"
              name="note"
              defaultValue={event?.note ?? ""}
              placeholder="Blok A bagian bawah, dekat saluran"
            />
          </Field>

          {event ? (
            <p className="text-muted-foreground text-xs">
              Tercatat {formatDate(event.eventDate)}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton>
              {editing ? "Simpan Perubahan" : "Simpan Catatan"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
