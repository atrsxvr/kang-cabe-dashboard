"use client";

import { useRef, useState } from "react";
import { HandCoins, Pencil } from "lucide-react";
import { toast } from "sonner";

import { dateInputValue, Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { RupiahInput } from "@/components/common/rupiah-input";
import { SubmitButton } from "@/components/common/submit-button";
import { useSaveAndRefresh } from "@/components/common/use-save-and-refresh";
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
import { loanOffset } from "@/lib/loans";
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
  loanBalances,
}: {
  members: MemberOption[];
  seasons: SeasonSummary[];
  payout?: PayoutRow;
  photoEnabled: boolean;
  /** What each member still owes the kas, counting this payout's own cut. */
  loanBalances: Record<string, number>;
}) {
  const editing = Boolean(payout);
  const initialType: PayoutType = payout?.type ?? "PROFIT_SHARE";
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [type, setType] = useState<PayoutType>(initialType);
  const [amount, setAmount] = useState(payout ? String(payout.amount) : "");
  const initialUser = payout?.user.id ?? members[0]?.id ?? "";
  const [userId, setUserId] = useState(initialUser);
  // On by default: the owners' rule is that an unpaid loan comes out of the
  // share. Editing keeps whatever was chosen when it was recorded.
  const initialOffset = payout ? Boolean(payout.loanOffset) : true;
  const [offsetLoan, setOffsetLoan] = useState(initialOffset);
  const [proof, setProof] = useState<File | null>(null);
  const [keepProof, setKeepProof] = useState(Boolean(payout?.proofUrl));
  const inputRef = useRef<HTMLInputElement>(null);
  const { refreshing, finish } = useSaveAndRefresh();

  const reset = () => {
    setErrors({});
    setType(initialType);
    setAmount(payout ? String(payout.amount) : "");
    setUserId(initialUser);
    setOffsetLoan(initialOffset);
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

    finish(editing ? "Catatan diperbarui." : "Uang keluar tercatat.", () => {
      setOpen(false);
      reset();
    });
  }

  const parsed = Number(amount.replace(/[^0-9]/g, ""));
  const needsSeason = type === "PROFIT_SHARE";

  // The balance shown counts this payout's own cut as still owed, so editing
  // it recomputes the cut from scratch — the same thing the server does.
  const owed =
    (loanBalances[userId] ?? 0) +
    (payout?.loanOffset && payout.user.id === userId ? payout.loanOffset.amount : 0);
  const canOffset = needsSeason && owed > 0;
  const cut = canOffset && offsetLoan ? loanOffset(owed, parsed) : 0;

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
            Bayar ke Anggota
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Pembayaran ke Anggota" : "Bayar ke Anggota"}
          </DialogTitle>
          <DialogDescription>
            Bagi hasil atau modal yang ditarik. Untuk anggota yang meminjam uang
            kas, pakai Catat Pinjaman di bagian Pinjaman Anggota.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          {editing ? (
            <input type="hidden" name="payoutId" value={payout!.id} />
          ) : null}

          <Field id="payout-type" label="Jenis" error={errors.type}>
            <NativeSelect
              required
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
              required
              id="payout-user"
              name="userId"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
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
              <RupiahInput
                id="payout-amount"
                name="amount"
                required
                value={amount}
                onValueChange={setAmount}
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

          {canOffset ? (
            <div className="grid gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <label className="flex items-center gap-2">
                <Checkbox
                  name="offsetLoan"
                  checked={offsetLoan}
                  onCheckedChange={(checked) => setOffsetLoan(checked === true)}
                />
                <span>
                  Potong pinjaman (sisa {formatRupiah(owed)})
                </span>
              </label>
              {cut > 0 ? (
                <p className="text-xs tabular-nums">
                  Dipotong {formatRupiah(cut)} · diserahkan{" "}
                  <span className="font-semibold">{formatRupiah(parsed - cut)}</span>
                  {owed > cut ? ` · sisa pinjaman ${formatRupiah(owed - cut)}` : " · pinjaman lunas"}
                </p>
              ) : null}
            </div>
          ) : null}

          <Field
            id="payout-season"
            label={needsSeason ? "Bagi hasil musim" : "Musim (opsional)"}
            error={errors.seasonId}
          >
            <NativeSelect
              id="payout-season"
              name="seasonId"
              // A profit share without a season has nothing to be a share of.
              required={needsSeason}
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
              placeholder="Tulis catatan"
            />
          </Field>

          {photoEnabled ? (
            <Field id="payout-proof" label="Foto Bukti Transfer (opsional)">
              <Input
                ref={inputRef}
                id="payout-proof"
                type="file"
                accept="image/*"
                // No `capture`: proof of a transfer is usually a screenshot
                // already in the gallery, which `capture` would hide.
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
            <SubmitButton busy={refreshing}>{editing ? "Simpan Perubahan" : "Simpan"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
