"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { dateInputValue, Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { RupiahInput } from "@/components/common/rupiah-input";
import { SubmitButton } from "@/components/common/submit-button";
import { useSaveAndRefresh } from "@/components/common/use-save-and-refresh";
import { BuyerFields } from "@/components/harvest/buyer-fields";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CHILI_GRADES,
  formatKg,
  gradeLabels,
  lineTotal,
  type ChiliGradeValue,
} from "@/lib/harvest";
import { buyerKindLabels } from "@/lib/buyers";
import { parseAmount } from "@/lib/dose";
import { formatRupiah, roundUpToCash } from "@/lib/money";
import { verdictFor } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { createSale, updateSale } from "@/server/actions/harvest";
import { NEW_BUYER } from "@/server/actions/schemas";
import type { BuyerOption } from "@/server/queries/buyers";
import type { SaleRow } from "@/server/queries/harvest";
import type { MemberOption } from "@/server/queries/users";

type Line = { weightKg: string; pricePerKg: string };

const blank = (): Record<ChiliGradeValue, Line> => ({
  GOOD: { weightKg: "", pricePerKg: "" },
  REJECT: { weightKg: "", pricePerKg: "" },
});

function fromSale(sale?: SaleRow): Record<ChiliGradeValue, Line> {
  const lines = blank();
  for (const item of sale?.items ?? []) {
    lines[item.grade] = {
      weightKg: String(item.weightKg),
      pricePerKg: String(item.pricePerKg),
    };
  }
  return lines;
}

/**
 * A row per grade, each with its own price.
 *
 * Bagus goes to a restaurant and afkir to a pengepul at very different rates,
 * often in the same load — one price for the whole transaction cannot say
 * that, and forcing two transactions would misreport how many trips were made.
 */
export function SaleDialog({
  seasonId,
  members,
  buyers,
  sale,
  projectedBep,
}: {
  seasonId: string;
  members: MemberOption[];
  /** Daftar pembeli, yang paling baru membeli di atas. */
  buyers: BuyerOption[];
  sale?: SaleRow;
  /**
   * Modal per kilo buat menakar harga yang sedang diketik. Null kalau proyeksi
   * panennya belum diisi — dialog ini lantas diam soal harga, karena patokan
   * karangan justru dipakai persis di saat orangnya tidak sempat meragukannya.
   */
  projectedBep: number | null;
}) {
  const editing = Boolean(sale);
  // Nobody listed yet: straight to typing the first buyer in.
  const initialBuyer = sale?.buyer.id ?? (buyers.length === 0 ? NEW_BUYER : "");
  const [buyerId, setBuyerId] = useState(initialBuyer);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lines, setLines] = useState(fromSale(sale));
  const { refreshing, finish } = useSaveAndRefresh();

  const filled = CHILI_GRADES.map((grade) => ({
    grade,
    weightKg: kgOf(lines[grade].weightKg),
    pricePerKg: Math.round(kgOf(lines[grade].pricePerKg)),
  })).filter((line) => line.weightKg > 0 && line.pricePerKg > 0);

  const totalKg = filled.reduce((sum, line) => sum + line.weightKg, 0);
  const subtotal = filled.reduce(
    (sum, line) => sum + lineTotal(line.weightKg, line.pricePerKg),
    0,
  );
  // What actually changes hands: nobody here carries anything smaller than a
  // five-hundred note.
  const totalAmount = roundUpToCash(subtotal);

  const reset = () => {
    setErrors({});
    setLines(fromSale(sale));
    setBuyerId(initialBuyer);
  };

  async function onSubmit(formData: FormData) {
    if (filled.length === 0) {
      setErrors({ items: "Isi minimal satu mutu, lengkap dengan harganya." });
      toast.error("Belum ada yang dijual.");
      return;
    }

    const result = editing
      ? await updateSale(formData)
      : await createSale(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    finish(editing ? "Penjualan diperbarui." : "Penjualan tercatat.", () => {
      setOpen(false);
      reset();
    });
  }

  const set = (grade: ChiliGradeValue, field: keyof Line, value: string) =>
    setLines((current) => ({
      ...current,
      [grade]: { ...current[grade], [field]: value },
    }));

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
            aria-label="Edit penjualan"
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" aria-hidden />
            Catat Penjualan
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Penjualan" : "Catat Penjualan"}
          </DialogTitle>
          <DialogDescription>
            Isi per mutu, harganya boleh beda. Yang kosong berarti nggak ikut
            terjual kali ini.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="seasonId" value={seasonId} />
          {editing ? (
            <input type="hidden" name="saleId" value={sale!.id} />
          ) : null}
          <input type="hidden" name="items" value={JSON.stringify(filled)} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="soldAt" label="Tanggal Jual" error={errors.soldAt}>
              <Input
                id="soldAt"
                name="soldAt"
                type="date"
                required
                defaultValue={dateInputValue(sale?.soldAt)}
                aria-invalid={Boolean(errors.soldAt)}
              />
            </Field>

            <Field id="buyerId" label="Pembeli" error={errors.buyerId}>
              <NativeSelect
                id="buyerId"
                name="buyerId"
                required
                value={buyerId}
                onChange={(event) => setBuyerId(event.target.value)}
                aria-invalid={Boolean(errors.buyerId)}
              >
                <option value="" disabled>
                  — pilih pembeli —
                </option>
                {buyers.map((buyer) => (
                  <option key={buyer.id} value={buyer.id}>
                    {buyer.name}
                    {buyer.kind ? ` · ${buyerKindLabels[buyer.kind]}` : ""}
                  </option>
                ))}
                {/* Last, so the regulars are what the thumb lands on first. */}
                <option value={NEW_BUYER}>+ Pembeli baru…</option>
              </NativeSelect>
            </Field>
          </div>

          {/* A one-off buyer is recorded too, without leaving the sale. The
              buyer is created in the same save, and not at all if the sale
              is refused. */}
          {buyerId === NEW_BUYER ? (
            <fieldset className="grid gap-3 rounded-md border p-3">
              <legend className="px-1 text-sm font-medium">Pembeli baru</legend>
              <BuyerFields prefix="buyer" errors={errors} />
            </fieldset>
          ) : null}

          <fieldset className="grid gap-3 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Yang dijual</legend>

            {CHILI_GRADES.map((grade) => {
              const weight = kgOf(lines[grade].weightKg);
              const price = Math.round(kgOf(lines[grade].pricePerKg));

              return (
                <div key={grade} className="grid gap-1">
                  <Label className="text-xs">{gradeLabels[grade]}</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={lines[grade].weightKg}
                      onChange={(event) =>
                        set(grade, "weightKg", event.target.value)
                      }
                      inputMode="decimal"
                      className="w-24"
                      placeholder="kg"
                      aria-label={`Bobot ${gradeLabels[grade]}`}
                    />
                    <span className="text-muted-foreground text-sm">kg ×</span>
                    <RupiahInput
                      value={lines[grade].pricePerKg}
                      onValueChange={(digits) =>
                        set(grade, "pricePerKg", digits)
                      }
                      className="w-28"
                      placeholder="harga/kg"
                      aria-label={`Harga ${gradeLabels[grade]} per kg`}
                    />
                    <span className="text-muted-foreground ml-auto text-sm tabular-nums">
                      {weight > 0 && price > 0
                        ? formatRupiah(lineTotal(weight, price))
                        : "—"}
                    </span>
                  </div>

                  {/* Bagus saja. Tier-nya dibangun dari modal per kilo Bagus,
                      dan afkir sampai sekarang belum pernah punya harga pasar
                      — menghakiminya dengan lantai yang sama akan menyuruh
                      menahan barang yang memang tidak punya patokan. */}
                  {grade === "GOOD" ? (
                    <PriceVerdictLine price={price} bep={projectedBep} />
                  ) : null}
                </div>
              );
            })}

            {errors.items ? (
              <p className="text-destructive text-xs" role="alert">
                {errors.items}
              </p>
            ) : null}
          </fieldset>

          <div className="grid gap-0.5 text-sm">
            <p>
              Total{" "}
              <strong className="tabular-nums">{formatKg(totalKg)}</strong> ·{" "}
              <strong className="tabular-nums">
                {formatRupiah(totalAmount)}
              </strong>
            </p>
            {totalAmount !== subtotal ? (
              <p className="text-muted-foreground text-xs tabular-nums">
                Hitungannya {formatRupiah(subtotal)}, dibulatkan naik{" "}
                {formatRupiah(totalAmount - subtotal)}
              </p>
            ) : null}
          </div>

          <label className="hover:bg-accent flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <Checkbox name="isPaid" defaultChecked={sale?.isPaid ?? false} />
            <span>Sudah dibayar</span>
          </label>

          <Field
            id="sale-recordedById"
            label="Dicatat oleh"
            error={errors.recordedById}
          >
            <NativeSelect
              id="sale-recordedById"
              name="recordedById"
              defaultValue={sale?.recordedBy?.id ?? ""}
            >
              <option value="">— nggak disebutkan —</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            id="sale-notes"
            label="Catatan (opsional)"
            error={errors.notes}
          >
            <Textarea
              id="sale-notes"
              name="notes"
              rows={2}
              defaultValue={sale?.notes ?? ""}
              placeholder="Diangkut sore, timbangan di tempat"
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
            <SubmitButton busy={refreshing}>
              {editing ? "Simpan Perubahan" : "Simpan Penjualan"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Menakar harga yang sedang diketik, sebelum tombol simpan ditekan.
 *
 * Di sinilah angkanya benar-benar mengubah sesuatu. Sebuah kartu di halaman
 * Keuangan dibaca sesudah semuanya terjadi; yang menentukan adalah orang yang
 * sedang berdiri di depan pengepul dengan angka setengah diketik — dan
 * satu-satunya cara ia menolong adalah kalau ia muncul di situ.
 */
function PriceVerdictLine({
  price,
  bep,
}: {
  price: number;
  bep: number | null;
}) {
  if (bep === null || price <= 0) return null;

  const verdict = verdictFor(price, bep);
  const short = verdict.againstMinimum < 0;

  return (
    <p
      className={cn(
        "text-xs",
        verdict.belowCost
          ? "text-destructive font-medium"
          : short
            ? "text-amber-700 dark:text-amber-400"
            : "text-muted-foreground",
      )}
    >
      {verdict.belowCost
        ? `Di bawah modal ${formatRupiah(bep)}/kg — tiap kilo yang lepas di harga ini nombok.`
        : short
          ? `${verdict.tier.label} · kurang ${formatRupiah(Math.abs(verdict.againstMinimum))} dari lantai minimum.`
          : `${verdict.tier.label} · ${formatRupiah(verdict.againstMinimum)} di atas lantai minimum.`}
    </p>
  );
}

/** Blank or half-typed means nothing yet, not NaN. */
function kgOf(input: string): number {
  const value = parseAmount(input);
  return Number.isFinite(value) ? value : 0;
}
