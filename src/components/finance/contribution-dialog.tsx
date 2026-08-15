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
import {
  createContribution,
  updateContribution,
} from "@/server/actions/capital";
import type { ContributionRow } from "@/server/queries/capital";
import type { SeasonSummary } from "@/server/queries/seasons";
import type { MemberOption } from "@/server/queries/users";

/**
 * Money a member put in, recorded apart from anything the garden earned.
 *
 * The season is optional and only ever a label: capital paid at the start
 * keeps working through every planting after it, so tying it to one would make
 * that planting look like it carried the whole thing.
 */
export function ContributionDialog({
  members,
  seasons,
  contribution,
  photoEnabled,
}: {
  members: MemberOption[];
  seasons: SeasonSummary[];
  contribution?: ContributionRow;
  photoEnabled: boolean;
}) {
  const editing = Boolean(contribution);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState(
    contribution ? String(contribution.amount) : "",
  );
  const [proof, setProof] = useState<File | null>(null);
  const [keepProof, setKeepProof] = useState(Boolean(contribution?.proofUrl));
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const reset = () => {
    setErrors({});
    setAmount(contribution ? String(contribution.amount) : "");
    setProof(null);
    setKeepProof(Boolean(contribution?.proofUrl));
    if (inputRef.current) inputRef.current.value = "";
  };

  async function onSubmit(formData: FormData) {
    if (proof) formData.set("proof", proof);
    else formData.delete("proof");

    formData.set("proofUrl", keepProof ? (contribution?.proofUrl ?? "") : "");

    const result = editing
      ? await updateContribution(formData)
      : await createContribution(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setOpen(false);
    reset();
    toast.success(editing ? "Setoran diperbarui." : "Setoran tercatat.");
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
            aria-label="Edit setoran"
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <HandCoins className="size-4" aria-hidden />
            Catat Setoran
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Setoran Modal" : "Catat Setoran Modal"}
          </DialogTitle>
          <DialogDescription>
            Iuran yang disetor anggota. Dicatat terpisah dari hasil jualan — ini
            uang yang ditaruh, bukan uang yang didapat.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          {editing ? (
            <input
              type="hidden"
              name="contributionId"
              value={contribution!.id}
            />
          ) : null}

          <Field id="contrib-user" label="Anggota" error={errors.userId}>
            <NativeSelect
              id="contrib-user"
              name="userId"
              defaultValue={contribution?.user.id ?? members[0]?.id ?? ""}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="contrib-amount"
              label="Jumlah (Rp)"
              error={errors.amount}
            >
              <Input
                id="contrib-amount"
                name="amount"
                inputMode="numeric"
                required
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="2500000"
                aria-invalid={Boolean(errors.amount)}
              />
              {parsed > 0 ? (
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatRupiah(parsed)}
                </p>
              ) : null}
            </Field>

            <Field
              id="contrib-paidAt"
              label="Tanggal Setor"
              error={errors.paidAt}
            >
              <Input
                id="contrib-paidAt"
                name="paidAt"
                type="date"
                required
                defaultValue={dateInputValue(contribution?.paidAt)}
                aria-invalid={Boolean(errors.paidAt)}
              />
            </Field>
          </div>

          <Field
            id="contrib-season"
            label="Buat musim (opsional)"
            error={errors.seasonId}
            hint="Kosongin buat modal awal. Diisi kalau ini iuran susulan buat putaran tertentu."
          >
            <NativeSelect
              id="contrib-season"
              name="seasonId"
              defaultValue={contribution?.season?.id ?? ""}
            >
              <option value="">— modal umum, nggak diikat musim —</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            id="contrib-note"
            label="Catatan (opsional)"
            error={errors.note}
          >
            <Input
              id="contrib-note"
              name="note"
              defaultValue={contribution?.note ?? ""}
              placeholder="Transfer BCA, iuran awal"
            />
          </Field>

          {photoEnabled ? (
            <Field id="contrib-proof" label="Foto Bukti Transfer (opsional)">
              <Input
                ref={inputRef}
                id="contrib-proof"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setProof(event.target.files?.[0] ?? null)}
              />
              {contribution?.proofUrl && keepProof && !proof ? (
                <div className="flex items-center gap-2">
                  <a
                    href={contribution.proofUrl}
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
            <SubmitButton>
              {editing ? "Simpan Perubahan" : "Simpan Setoran"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
