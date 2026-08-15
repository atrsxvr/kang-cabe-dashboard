"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
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
  createFinanceEntry,
  updateFinanceEntry,
} from "@/server/actions/finance";
import { expenseCategories } from "@/server/actions/schemas";
import type { FinanceEntryRow } from "@/server/queries/finance";

/**
 * Money that never passes the shed or the scales — wages, rent, the trip to
 * town. Sales are not entered here: income is read from them directly, so
 * there is only ever one row per rupiah.
 */
export function FinanceEntryDialog({
  seasonId,
  entry,
  photoEnabled,
}: {
  seasonId: string;
  entry?: FinanceEntryRow;
  photoEnabled: boolean;
}) {
  const editing = Boolean(entry);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  // Held in state rather than left in the input: React resets the form after
  // an action returns, including on a validation error, which would silently
  // drop the chosen file while its name still showed.
  const [proof, setProof] = useState<File | null>(null);
  const [keepProof, setKeepProof] = useState(Boolean(entry?.proofUrl));
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const reset = () => {
    setErrors({});
    setAmount(entry ? String(entry.amount) : "");
    setProof(null);
    setKeepProof(Boolean(entry?.proofUrl));
    if (inputRef.current) inputRef.current.value = "";
  };

  async function onSubmit(formData: FormData) {
    if (proof) formData.set("proof", proof);
    else formData.delete("proof");

    formData.set("proofUrl", keepProof ? (entry?.proofUrl ?? "") : "");

    const result = editing
      ? await updateFinanceEntry(formData)
      : await createFinanceEntry(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setOpen(false);
    reset();
    toast.success(editing ? "Catatan diperbarui." : "Catatan ditambahkan.");
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
            aria-label="Edit catatan"
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" aria-hidden />
            Catat Pengeluaran
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Catatan" : "Catat Pemasukan / Pengeluaran"}
          </DialogTitle>
          <DialogDescription>
            Buat uang yang nggak lewat gudang atau timbangan — upah, sewa,
            transport. Penjualan panen nggak usah diketik lagi di sini.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="seasonId" value={seasonId} />
          {editing ? (
            <input type="hidden" name="entryId" value={entry!.id} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="entry-type" label="Jenis" error={errors.type}>
              <NativeSelect
                id="entry-type"
                name="type"
                defaultValue={entry?.type ?? "EXPENSE"}
              >
                <option value="EXPENSE">Uang keluar</option>
                <option value="INCOME">Uang masuk</option>
              </NativeSelect>
            </Field>

            <Field id="entry-category" label="Kategori" error={errors.category}>
              <NativeSelect
                id="entry-category"
                name="category"
                defaultValue={entry?.category ?? "Upah"}
              >
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="entry-amount" label="Jumlah (Rp)" error={errors.amount}>
              <Input
                id="entry-amount"
                name="amount"
                inputMode="numeric"
                required
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="150000"
                aria-invalid={Boolean(errors.amount)}
              />
              {parsed > 0 ? (
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatRupiah(parsed)}
                </p>
              ) : null}
            </Field>

            <Field id="entry-date" label="Tanggal" error={errors.date}>
              <Input
                id="entry-date"
                name="date"
                type="date"
                required
                defaultValue={dateInputValue(entry?.date)}
                aria-invalid={Boolean(errors.date)}
              />
            </Field>
          </div>

          <Field
            id="entry-description"
            label="Keterangan"
            error={errors.description}
          >
            <Input
              id="entry-description"
              name="description"
              required
              defaultValue={entry?.description ?? ""}
              placeholder="Upah 2 orang, bersihin gulma"
              aria-invalid={Boolean(errors.description)}
            />
          </Field>

          {photoEnabled ? (
            <Field id="entry-proof" label="Foto Nota (opsional)">
              <Input
                ref={inputRef}
                id="entry-proof"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setProof(event.target.files?.[0] ?? null)}
              />
              {entry?.proofUrl && keepProof && !proof ? (
                <div className="flex items-center gap-2">
                  <a
                    href={entry.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline"
                  >
                    Lihat nota yang tersimpan
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
              {editing ? "Simpan Perubahan" : "Simpan Catatan"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
