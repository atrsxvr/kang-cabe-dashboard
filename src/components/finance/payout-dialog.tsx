"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Pencil } from "lucide-react";
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
import { formatRupiah } from "@/lib/money";
import { createPayout, updatePayout } from "@/server/actions/payouts";
import type { PayoutRow } from "@/server/queries/cash";
import type { SeasonSummary } from "@/server/queries/seasons";
import type { MemberOption } from "@/server/queries/users";

type PayoutType = PayoutRow["type"];

const typeHints: Record<PayoutType, string> = {
  PROFIT_SHARE:
    "Bagian laba musim yang dibayarkan. Nggak mengurangi modal orangnya.",
  CAPITAL_RETURN:
    "Setoran yang dikembalikan. Mengurangi modal dan porsi modal orangnya.",
};

/**
 * Uang yang keluar dari kas ke tangan anggota.
 *
 * Jenisnya dipilih di depan karena akibatnya beda: bagi hasil tidak menyentuh
 * modal, tarik modal menguranginya. Menebak dari catatannya akan membuat porsi
 * modal bergantung pada kata yang kebetulan diketik.
 */
export function PayoutDialog({
  members,
  seasons,
  payout,
  photoEnabled,
}: {
  members: MemberOption[];
  seasons: SeasonSummary[];
  payout?: PayoutRow;
  photoEnabled: boolean;
}) {
  const editing = Boolean(payout);
  const initialType: PayoutType = payout?.type ?? "PROFIT_SHARE";
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [type, setType] = useState<PayoutType>(initialType);
  const [amount, setAmount] = useState(payout ? String(payout.amount) : "");
  const [proof, setProof] = useState<File | null>(null);
  const [keepProof, setKeepProof] = useState(Boolean(payout?.proofUrl));
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const reset = () => {
    setErrors({});
    setType(initialType);
    setAmount(payout ? String(payout.amount) : "");
    setProof(null);
    setKeepProof(Boolean(payout?.proofUrl));
    if (inputRef.current) inputRef.current.value = "";
  };

  async function onSubmit(formData: FormData) {
    if (proof) formData.set("proof", proof);
    else formData.delete("proof");

    formData.set("proofUrl", keepProof ? (payout?.proofUrl ?? "") : "");

    const result = editing
      ? await updatePayout(formData)
      : await createPayout(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setOpen(false);
    reset();
    toast.success(editing ? "Catatan diperbarui." : "Uang keluar tercatat.");
    router.refresh();
  }

  const parsed = Number(amount.replace(/[^0-9]/g, ""));
  const needsSeason = type === "PROFIT_SHARE";

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
            aria-label="Edit uang keluar"
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <HandCoins className="size-4" aria-hidden />
            Catat Uang Keluar
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Uang Keluar ke Anggota" : "Catat Uang Keluar ke Anggota"}
          </DialogTitle>
          <DialogDescription>
            Uang dari kas yang dibayarkan ke anggota. Tanpa dicatat, saldo kas
            tetap menganggap uangnya masih ada.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          {editing ? (
            <input type="hidden" name="payoutId" value={payout!.id} />
          ) : null}

          <Field id="payout-type" label="Jenis" error={errors.type}>
            <NativeSelect
              id="payout-type"
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as PayoutType)}
            >
              <option value="PROFIT_SHARE">Bagi hasil</option>
              <option value="CAPITAL_RETURN">Tarik modal</option>
            </NativeSelect>
            <p className="text-muted-foreground text-xs">{typeHints[type]}</p>
          </Field>

          <Field id="payout-user" label="Anggota" error={errors.userId}>
            <NativeSelect
              id="payout-user"
              name="userId"
              defaultValue={payout?.user.id ?? members[0]?.id ?? ""}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="payout-amount" label="Jumlah (Rp)" error={errors.amount}>
              <Input
                id="payout-amount"
                name="amount"
                inputMode="numeric"
                required
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="500000"
                aria-invalid={Boolean(errors.amount)}
              />
              {parsed > 0 ? (
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatRupiah(parsed)}
                </p>
              ) : null}
            </Field>

            <Field id="payout-paidAt" label="Tanggal Dibayar" error={errors.paidAt}>
              <Input
                id="payout-paidAt"
                name="paidAt"
                type="date"
                required
                defaultValue={dateInputValue(payout?.paidAt)}
                aria-invalid={Boolean(errors.paidAt)}
              />
            </Field>
          </div>

          <Field
            id="payout-season"
            label={needsSeason ? "Bagi hasil musim" : "Musim (opsional)"}
            error={errors.seasonId}
          >
            <NativeSelect
              id="payout-season"
              name="seasonId"
              defaultValue={payout?.season?.id ?? ""}
              aria-invalid={Boolean(errors.seasonId)}
            >
              <option value="">
                {needsSeason ? "— pilih musimnya —" : "— nggak diikat musim —"}
              </option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field id="payout-note" label="Catatan (opsional)" error={errors.note}>
            <Input
              id="payout-note"
              name="note"
              defaultValue={payout?.note ?? ""}
              placeholder="Transfer BCA"
            />
          </Field>

          {photoEnabled ? (
            <Field id="payout-proof" label="Foto Bukti Transfer (opsional)">
              <Input
                ref={inputRef}
                id="payout-proof"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setProof(event.target.files?.[0] ?? null)}
              />
              {payout?.proofUrl && keepProof && !proof ? (
                <div className="flex items-center gap-2">
                  <a
                    href={payout.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline"
                  >
                    Lihat bukti yang tersimpan
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setKeepProof(false)}
                  >
                    Hapus
                  </Button>
                </div>
              ) : null}
            </Field>
          ) : null}

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
            <SubmitButton>{editing ? "Simpan Perubahan" : "Simpan"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
