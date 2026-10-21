"use client";

import { useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
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
import { formatDate } from "@/lib/hst";
import {
  isLaborEntry,
  LABOR_CATEGORY,
  LABOR_JOB_SUGGESTIONS,
} from "@/lib/labor";
import { formatRupiah } from "@/lib/money";
import {
  createFinanceEntry,
  updateFinanceEntry,
} from "@/server/actions/finance";
import { expenseCategories } from "@/server/actions/schemas";
import type { FinanceEntryRow } from "@/server/queries/finance";
import type { TaskOption } from "@/server/queries/tasks";

/**
 * Money that never passes the shed or the scales — wages, rent, the trip to
 * town. Sales are not entered here: income is read from them directly, so
 * there is only ever one row per rupiah.
 */
export function FinanceEntryDialog({
  seasonId,
  entry,
  photoEnabled,
  tasks,
}: {
  seasonId: string;
  entry?: FinanceEntryRow;
  photoEnabled: boolean;
  /** Finished tasks of this season, for a wage to name what it paid for. */
  tasks: TaskOption[];
}) {
  const editing = Boolean(entry);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  // Watched so a wage can ask for its job and payee, and nothing else does.
  const [type, setType] = useState<string>(entry?.type ?? "EXPENSE");
  const [category, setCategory] = useState<string>(entry?.category ?? LABOR_CATEGORY);
  const labor = isLaborEntry(type, category);
  // Held in state rather than left in the input: React resets the form after
  // an action returns, including on a validation error, which would silently
  // drop the chosen file while its name still showed.
  const [proof, setProof] = useState<File | null>(null);
  const [keepProof, setKeepProof] = useState(Boolean(entry?.proofUrl));
  const inputRef = useRef<HTMLInputElement>(null);
  const { refreshing, finish } = useSaveAndRefresh();

  const reset = () => {
    setErrors({});
    setAmount(entry ? String(entry.amount) : "");
    setType(entry?.type ?? "EXPENSE");
    setCategory(entry?.category ?? LABOR_CATEGORY);
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

    finish(editing ? "Catatan diperbarui." : "Catatan ditambahkan.", () => {
      setOpen(false);
      reset();
    });
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
            Catat Uang Masuk / Keluar
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
                required
                id="entry-type"
                name="type"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="EXPENSE">Uang keluar</option>
                <option value="INCOME">Uang masuk</option>
              </NativeSelect>
            </Field>

            <Field id="entry-category" label="Kategori" error={errors.category}>
              <NativeSelect
                required
                id="entry-category"
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          {/* Hired hands are paid per job once it is done, so a wage says
              which job and to whom — what anyone reading the wage bill asks. */}
          {labor ? (
            <fieldset className="grid gap-4 rounded-md border p-3">
              <legend className="px-1 text-sm font-medium">Upah borongan</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="entry-laborJob" label="Pekerjaan" error={errors.laborJob}>
                  <Input
                    id="entry-laborJob"
                    name="laborJob"
                    required
                    list="labor-job-suggestions"
                    defaultValue={entry?.laborJob ?? ""}
                    placeholder="Olah lahan"
                    aria-invalid={Boolean(errors.laborJob)}
                  />
                  <datalist id="labor-job-suggestions">
                    {LABOR_JOB_SUGGESTIONS.map((job) => (
                      <option key={job} value={job} />
                    ))}
                  </datalist>
                </Field>
                <Field id="entry-payee" label="Dibayar ke" error={errors.payee}>
                  <Input
                    id="entry-payee"
                    name="payee"
                    required
                    defaultValue={entry?.payee ?? ""}
                    placeholder="Mang Asep (mandor)"
                    aria-invalid={Boolean(errors.payee)}
                  />
                </Field>
              </div>
              <Field
                id="entry-taskId"
                label="Untuk tugas (opsional)"
                error={errors.taskId}
                hint="Tugas yang sudah selesai di musim ini. Kartu tugasnya ikut menunjukkan upah yang dibayar."
              >
                <NativeSelect
                  id="entry-taskId"
                  name="taskId"
                  defaultValue={entry?.task?.id ?? ""}
                >
                  <option value="">— tidak untuk tugas tertentu —</option>
                  {/* A task finished after this wage was first recorded, or
                      one since reopened, still has to be offered back. */}
                  {entry?.task && !tasks.some((task) => task.id === entry.task!.id) ? (
                    <option value={entry.task.id}>{entry.task.title}</option>
                  ) : null}
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                      {task.completedAt ? ` · ${formatDate(task.completedAt)}` : ""}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </fieldset>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="entry-amount" label="Jumlah (Rp)" error={errors.amount}>
              <RupiahInput
                id="entry-amount"
                name="amount"
                required
                value={amount}
                onValueChange={setAmount}
                placeholder="150.000"
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
                // No `capture`: proof of a transfer is usually a screenshot
                // already in the gallery, which `capture` would hide.
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
            <SubmitButton busy={refreshing}>
              {editing ? "Simpan Perubahan" : "Simpan Catatan"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
