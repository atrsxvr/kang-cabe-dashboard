"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { SubmitButton } from "@/components/common/submit-button";
import { stockReasonLabels } from "@/components/inventory/inventory-labels";
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
import { formatStock } from "@/lib/stock";
import { adjustStock } from "@/server/actions/inventory";
import type { StockRow } from "@/server/queries/inventory";
import type { MemberOption } from "@/server/queries/users";

/**
 * Direction is chosen by which button opened the dialog, so the amount is
 * always typed as a plain positive number. Asking someone in a shed to enter
 * "-2000" is asking for the sign to be wrong.
 */
export function AdjustStockDialog({
  material,
  members,
  direction,
  defaultAmount,
  trigger,
}: {
  material: StockRow;
  members: MemberOption[];
  direction: "in" | "out";
  /** Pre-filled from the shopping list, so buying closes the loop in one step. */
  defaultAmount?: number;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const adding = direction === "in";

  async function onSubmit(formData: FormData) {
    const amount = Math.abs(Number(formData.get("amount")));
    formData.set("delta", String(adding ? amount : -amount));

    const result = await adjustStock(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setOpen(false);
    toast.success(
      `${material.name}: ${adding ? "+" : "−"}${formatStock(amount, material.unit)}`
    );
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
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`${adding ? "Tambah" : "Kurangi"} stok ${material.name}`}
            disabled={!adding && material.stock <= 0}
          >
            {adding ? (
              <Plus className="size-4" aria-hidden />
            ) : (
              <Minus className="size-4" aria-hidden />
            )}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {adding ? "Tambah Stok" : "Kurangi Stok"} — {material.name}
          </DialogTitle>
          <DialogDescription>
            Stok sekarang {formatStock(material.stock, material.unit)}.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="materialId" value={material.id} />

          <Field
            id={`amount-${material.id}-${direction}`}
            label={`Jumlah (${material.unit})`}
            error={errors.delta}
          >
            <Input
              id={`amount-${material.id}-${direction}`}
              name="amount"
              type="number"
              min={0}
              step="any"
              required
              autoFocus
              defaultValue={defaultAmount ?? ""}
              placeholder="0"
              aria-invalid={Boolean(errors.delta)}
            />
          </Field>

          <Field
            id={`reason-${material.id}-${direction}`}
            label="Alasan"
            error={errors.reason}
          >
            <NativeSelect
              id={`reason-${material.id}-${direction}`}
              name="reason"
              defaultValue={adding ? "PURCHASE" : "USAGE"}
            >
              {Object.entries(stockReasonLabels)
                // Buying never reduces stock, and using never adds to it.
                .filter(([value]) =>
                  adding
                    ? value !== "USAGE" && value !== "LOSS"
                    : value !== "PURCHASE"
                )
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </NativeSelect>
          </Field>

          <Field
            id={`actor-${material.id}-${direction}`}
            label="Dicatat oleh"
            error={errors.actorId}
          >
            <NativeSelect
              id={`actor-${material.id}-${direction}`}
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
            id={`note-${material.id}-${direction}`}
            label="Catatan (opsional)"
            error={errors.note}
          >
            <Input
              id={`note-${material.id}-${direction}`}
              name="note"
              placeholder={adding ? "Beli di toko Tani Makmur" : "Kocor blok A"}
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton>{adding ? "Tambah" : "Kurangi"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
