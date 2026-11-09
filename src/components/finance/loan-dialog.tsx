"use client";

import { useState } from "react";
import { HandCoins, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { dateInputValue, Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { RupiahInput } from "@/components/common/rupiah-input";
import { SubmitButton } from "@/components/common/submit-button";
import { useSaveAndRefresh } from "@/components/common/use-save-and-refresh";
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
import { recordLoanEntry } from "@/server/actions/loans";
import type { MemberOption } from "@/server/queries/users";

/**
 * Uang kas yang dipinjam anggota (`LENT`), atau yang dikembalikannya
 * (`REPAID`). Tanpa bunga.
 *
 * Pengembalian hanya menawarkan anggota yang masih punya pinjaman, dan
 * jumlahnya terisi sisa pinjaman orang itu — yang paling sering terjadi
 * adalah melunasi.
 */
export function LoanDialog({
  type,
  members,
  balances,
}: {
  type: "LENT" | "REPAID";
  /**
   * Who can be picked. For a loan, the active members; for a repayment,
   * whoever still owes — including someone deactivated since, whose debt does
   * not disappear with their access.
   */
  members: Pick<MemberOption, "id" | "name">[];
  /** Sisa pinjaman per anggota. */
  balances: Record<string, number>;
}) {
  const lending = type === "LENT";
  const choices = members;

  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstId = choices[0]?.id ?? "";
  const [userId, setUserId] = useState(firstId);
  const owedBy = (id: string) => balances[id] ?? 0;
  const [amount, setAmount] = useState(
    lending || !firstId ? "" : String(owedBy(firstId)),
  );
  const { refreshing, finish } = useSaveAndRefresh();

  const reset = () => {
    setErrors({});
    setUserId(firstId);
    setAmount(lending || !firstId ? "" : String(owedBy(firstId)));
  };

  async function onSubmit(formData: FormData) {
    const result = await recordLoanEntry(formData);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }
    finish(lending ? "Pinjaman tercatat." : "Pengembalian tercatat.", () => {
      setOpen(false);
      reset();
    });
  }

  const owed = owedBy(userId);
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
        {lending ? (
          <Button size="sm">
            <HandCoins className="size-4" aria-hidden />
            Catat Pinjaman
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled={choices.length === 0}>
            <Undo2 className="size-4" aria-hidden />
            Catat Pengembalian
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{lending ? "Catat Pinjaman" : "Catat Pengembalian"}</DialogTitle>
          <DialogDescription>
            {lending
              ? "Uang kas yang dipinjam anggota untuk keperluan pribadi. Kas berkurang sekarang, dan bertambah lagi saat dikembalikan. Tanpa bunga."
              : "Uang pinjaman yang dikembalikan tunai ke kas. Yang dipotong dari bagi hasil tercatat sendiri lewat Bayar ke Anggota."}
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="type" value={type} />

          <Field id={`loan-user-${type}`} label="Anggota" error={errors.userId}>
            <NativeSelect
              required
              id={`loan-user-${type}`}
              name="userId"
              value={userId}
              onChange={(event) => {
                setUserId(event.target.value);
                if (!lending) setAmount(String(owedBy(event.target.value)));
              }}
            >
              {choices.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                  {!lending ? ` — sisa ${formatRupiah(owedBy(member.id))}` : ""}
                </option>
              ))}
            </NativeSelect>
            {lending && owed > 0 ? (
              <p className="text-muted-foreground text-xs">
                Masih punya pinjaman {formatRupiah(owed)}; yang ini ditambahkan.
              </p>
            ) : null}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`loan-amount-${type}`} label="Jumlah (Rp)" error={errors.amount}>
              <RupiahInput
                id={`loan-amount-${type}`}
                name="amount"
                required
                value={amount}
                onValueChange={setAmount}
                aria-invalid={Boolean(errors.amount)}
              />
              {!lending && parsed > 0 && parsed < owed ? (
                <p className="text-muted-foreground text-xs tabular-nums">
                  Sisa pinjaman nanti {formatRupiah(owed - parsed)}
                </p>
              ) : null}
            </Field>

            <Field id={`loan-date-${type}`} label="Tanggal" error={errors.date}>
              <Input
                id={`loan-date-${type}`}
                name="date"
                type="date"
                required
                max={dateInputValue()}
                defaultValue={dateInputValue()}
                aria-invalid={Boolean(errors.date)}
              />
            </Field>
          </div>

          <Field id={`loan-note-${type}`} label="Catatan (opsional)" error={errors.note}>
            <Input
              id={`loan-note-${type}`}
              name="note"
              placeholder={lending ? "Mis. buat biaya sekolah" : "Tulis catatan"}
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
            <SubmitButton busy={refreshing}>Simpan</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
