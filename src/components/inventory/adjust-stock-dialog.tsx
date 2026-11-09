"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus } from "lucide-react";
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
 * Stock leaving the shed outside a task: used, spoiled, or counted short.
 *
 * Only ever takes away. Stock comes in through Catat Belanja, which puts the
 * money in the kas as well, and a count that turned out higher is an
 * opname's job. The amount is typed as a plain positive number — asking
 * someone in a shed to enter "-2000" is asking for the sign to be wrong.
 */
export function AdjustStockDialog({
  material,
  members,
  seasons,
  currentSeasonId,
}: {
  material: StockRow;
  members: MemberOption[];
  /** Musim yang bisa dibebani, untuk bahan yang keluar di luar tugas. */
  seasons?: { id: string; name: string }[];
  currentSeasonId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("USAGE");
  const router = useRouter();

  const reset = () => {
    setErrors({});
    setAmount("");
    setReason("USAGE");
  };

  async function onSubmit(formData: FormData) {
    const moved = Math.abs(Number(formData.get("amount")));
    formData.set("delta", String(-moved));

    const result = await adjustStock(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setOpen(false);
    reset();
    toast.success(`${material.name}: −${formatStock(moved, material.unit)}`);
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
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Kurangi stok ${material.name}`}
          disabled={material.stock <= 0}
        >
          <Minus className="size-4" aria-hidden />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Kurangi Stok — {material.name}
          </DialogTitle>
          <DialogDescription>
            Stok sekarang {formatStock(material.stock, material.unit)}.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="materialId" value={material.id} />

          <Field
            id={`amount-${material.id}-out`}
            label={`Jumlah (${material.unit})`}
            error={errors.delta}
          >
            <Input
              id={`amount-${material.id}-out`}
              name="amount"
              type="number"
              min={0}
              step="any"
              required
              autoFocus
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={Boolean(errors.delta)}
            />
          </Field>

          <Field
            id={`reason-${material.id}-out`}
            label="Alasan"
            error={errors.reason}
          >
            <NativeSelect
              required
              id={`reason-${material.id}-out`}
              name="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {Object.entries(stockReasonLabels)
                // Buying never reduces stock.
                .filter(([value]) => value !== "PURCHASE")
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </NativeSelect>
          </Field>


          {/* Stock leaving for a job that never became a task — twenty stakes
              to replace broken ones. Naming a season is what carries it into
              that season's cost; leaving it blank keeps it out. */}
          {seasons && seasons.length > 0 ? (
            <Field
              id={`season-${material.id}`}
              label="Buat musim (opsional)"
              error={errors.seasonId}
              hint="Kalau diisi, nilainya masuk ke biaya musim itu"
            >
              <NativeSelect
                id={`season-${material.id}`}
                name="seasonId"
                defaultValue={currentSeasonId ?? ""}
              >
                <option value="">— nggak dibebankan ke musim —</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : null}

          <Field
            id={`actor-${material.id}-out`}
            label="Dicatat oleh"
            error={errors.actorId}
          >
            <NativeSelect
              id={`actor-${material.id}-out`}
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
            id={`note-${material.id}-out`}
            label="Catatan (opsional)"
            error={errors.note}
          >
            <Input
              id={`note-${material.id}-out`}
              name="note"
              placeholder="Tulis catatan"
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
            <SubmitButton>Kurangi</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
