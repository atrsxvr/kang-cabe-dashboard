"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { SubmitButton } from "@/components/common/submit-button";
import { toolEventLabels } from "@/components/inventory/inventory-labels";
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
import { formatRupiah } from "@/lib/money";
import { recordToolEvent } from "@/server/actions/inventory";
import { changesQuantity, toolEventTypes } from "@/server/actions/schemas";
import type { ToolRow } from "@/server/queries/inventory";
import type { MemberOption } from "@/server/queries/users";

/**
 * Records what happened and shows what has happened before. Losing one of
 * three hoes leaves two; six months later this log is the only thing that can
 * say where the third went.
 */
export function ToolEventDialog({
  tool,
  members,
}: {
  tool: ToolRow;
  members: MemberOption[];
}) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // A tool someone is holding is most likely coming back; one in the shed is
  // most likely going out or being reported broken.
  const [type, setType] = useState<string>(
    tool.heldBy ? "RETURNED" : "CHECKED_OUT"
  );
  const router = useRouter();

  const affectsCount = changesQuantity(
    type as (typeof toolEventTypes)[number]
  );

  // Buying one and paying to fix one are the two that cost money. Losing a
  // hoe is a loss, but nobody handed over rupiah for it.
  const costsMoney = type === "ACQUIRED" || type === "SERVICED";
  // Borrowing changes who has it, not how many we own.
  const takingOut = type === "CHECKED_OUT";

  async function onSubmit(formData: FormData) {
    const result = await recordToolEvent(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setOpen(false);
    toast.success(`${tool.name}: ${toolEventLabels[type]}.`);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setErrors({});
          setType("DAMAGED");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Catat kejadian ${tool.name}`}
        >
          <History className="size-4" aria-hidden />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat Kejadian — {tool.name}</DialogTitle>
          <DialogDescription>
            Jumlah sekarang {tool.quantity}.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="toolId" value={tool.id} />

          <Field id={`event-type-${tool.id}`} label="Kejadian" error={errors.type}>
            <NativeSelect
              id={`event-type-${tool.id}`}
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              {toolEventTypes.map((value) => (
                <option key={value} value={value}>
                  {toolEventLabels[value]}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {/* Only shown when it means something — a serviced tool does not have
              "how many" in the way a lost one does. */}
          {affectsCount ? (
            <Field
              id={`event-qty-${tool.id}`}
              label="Berapa unit"
              error={errors.quantity}
            >
              <Input
                id={`event-qty-${tool.id}`}
                name="quantity"
                type="number"
                min={1}
                required
                defaultValue={1}
                aria-invalid={Boolean(errors.quantity)}
              />
            </Field>
          ) : (
            <input type="hidden" name="quantity" value={1} />
          )}

          {costsMoney ? (
            <Field
              id={`event-cost-${tool.id}`}
              label={
                type === "SERVICED" ? "Ongkos servis (Rp)" : "Total bayar (Rp)"
              }
              error={errors.totalCost}
              hint="Kosongin aja kalau gratis atau notanya belum ada"
            >
              <Input
                id={`event-cost-${tool.id}`}
                name="totalCost"
                inputMode="numeric"
                placeholder="150000"
                aria-invalid={Boolean(errors.totalCost)}
              />
            </Field>
          ) : null}

          {takingOut ? (
            <Field
              id={`event-holder-${tool.id}`}
              label="Dibawa siapa"
              error={errors.holderId}
              hint="Biar kalau nyari nggak keliling kebun"
            >
              <NativeSelect
                id={`event-holder-${tool.id}`}
                name="holderId"
                defaultValue={tool.heldBy?.id ?? ""}
              >
                <option value="">— nggak disebutkan —</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : null}

          <Field
            id={`event-actor-${tool.id}`}
            label="Dicatat oleh"
            error={errors.actorId}
          >
            <NativeSelect
              id={`event-actor-${tool.id}`}
              name="actorId"
              defaultValue=""
            >
              <option value="">— tidak disebutkan —</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            id={`event-note-${tool.id}`}
            label="Catatan (opsional)"
            error={errors.note}
          >
            <Input
              id={`event-note-${tool.id}`}
              name="note"
              placeholder="Ketinggalan di kebun sebelah"
            />
          </Field>

          {tool.events.length > 0 ? (
            <div className="grid gap-1 rounded-md border p-3">
              <p className="text-muted-foreground mb-1 text-xs font-medium">
                Riwayat
              </p>
              {tool.events.map((event) => (
                <p key={event.id} className="text-xs">
                  <span className="text-muted-foreground tabular-nums">
                    {formatDate(event.createdAt)}
                  </span>{" "}
                  {toolEventLabels[event.type]}
                  {changesQuantity(event.type) ? ` ×${event.quantity}` : null}
                  {event.totalCost !== null ? (
                    <span className="font-medium tabular-nums">
                      {" "}
                      · {formatRupiah(event.totalCost)}
                    </span>
                  ) : null}
                  {event.actor ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {event.actor.name}
                    </span>
                  ) : null}
                  {event.note ? (
                    <span className="text-muted-foreground"> · {event.note}</span>
                  ) : null}
                </p>
              ))}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton>Catat</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
