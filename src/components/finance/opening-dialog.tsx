"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, PiggyBank } from "lucide-react";
import { toast } from "sonner";

import { dateInputValue, Field } from "@/components/common/form-field";
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
import { formatRupiah } from "@/lib/money";
import { createOpening, updateOpening } from "@/server/actions/openings";
import type { OpeningRow } from "@/server/queries/cash";

/**
 * Uang yang sudah ada di kas sebelum aplikasi dipakai.
 *
 * Tanpa pilihan anggota, dan itu intinya: uang ini milik kebun bersama. Kalau
 * suatu hari dibagi, pembagiannya dicatat sebagai uang keluar ke anggota.
 */
export function OpeningDialog({ opening }: { opening?: OpeningRow }) {
  const editing = Boolean(opening);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState(opening ? String(opening.amount) : "");
  const router = useRouter();

  const reset = () => {
    setErrors({});
    setAmount(opening ? String(opening.amount) : "");
  };

  async function onSubmit(formData: FormData) {
    const result = editing
      ? await updateOpening(formData)
      : await createOpening(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setOpen(false);
    reset();
    toast.success(editing ? "Saldo awal diperbarui." : "Saldo awal tercatat.");
    router.refresh();
  }

  const parsed = Number(amount.replace(/[^0-9]/g, ""));

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
            aria-label="Edit saldo awal"
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <PiggyBank className="size-4" aria-hidden />
            Catat Saldo Awal
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Saldo Awal Kas" : "Catat Saldo Awal Kas"}
          </DialogTitle>
          <DialogDescription>
            Uang yang udah ada di kas sebelum aplikasi ini dipakai, misalnya
            sisa kas musim pertama. Milik bersama — bukan setoran siapa-siapa,
            dan bukan pemasukan musim mana pun.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          {editing ? (
            <input type="hidden" name="openingId" value={opening!.id} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="opening-amount" label="Jumlah (Rp)" error={errors.amount}>
              <Input
                id="opening-amount"
                name="amount"
                inputMode="numeric"
                required
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="3000000"
                aria-invalid={Boolean(errors.amount)}
              />
              {parsed > 0 ? (
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatRupiah(parsed)}
                </p>
              ) : null}
            </Field>

            <Field
              id="opening-countedAt"
              label="Mulai dihitung"
              error={errors.countedAt}
            >
              <Input
                id="opening-countedAt"
                name="countedAt"
                type="date"
                required
                defaultValue={dateInputValue(opening?.countedAt)}
                aria-invalid={Boolean(errors.countedAt)}
              />
            </Field>
          </div>

          <Field id="opening-note" label="Catatan (opsional)" error={errors.note}>
            <Input
              id="opening-note"
              name="note"
              defaultValue={opening?.note ?? ""}
              placeholder="Sisa kas Musim 1"
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
              {editing ? "Simpan Perubahan" : "Simpan Saldo Awal"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
