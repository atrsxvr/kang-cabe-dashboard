"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Wrench } from "lucide-react";
import { toast } from "sonner";

import { dateInputValue, Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { SubmitButton } from "@/components/common/submit-button";
import { toolConditionLabels } from "@/components/inventory/inventory-labels";
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
import { Textarea } from "@/components/ui/textarea";
import { createTool, updateTool } from "@/server/actions/inventory";
import type { ToolRow } from "@/server/queries/inventory";

export function ToolDialog({ tool }: { tool?: ToolRow }) {
  const editing = Boolean(tool);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    const result = editing
      ? await updateTool(formData)
      : await createTool(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setOpen(false);
    toast.success(editing ? "Alat diperbarui." : "Alat ditambahkan.");
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
        {editing ? (
          <Button variant="ghost" size="sm" aria-label={`Edit ${tool!.name}`}>
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <Wrench className="size-4" aria-hidden />
            Tambah Alat
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Alat" : "Tambah Alat"}</DialogTitle>
          <DialogDescription>
            Alat dipakai lintas musim, jadi tidak terikat musim tanam mana pun.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          {editing ? (
            <input type="hidden" name="toolId" value={tool!.id} />
          ) : null}

          <Field id="tool-name" label="Nama Alat" error={errors.name}>
            <Input
              id="tool-name"
              name="name"
              required
              defaultValue={tool?.name}
              placeholder="Tangki Semprot 16L"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="tool-quantity" label="Jumlah" error={errors.quantity}>
              <Input
                id="tool-quantity"
                name="quantity"
                type="number"
                min={1}
                required
                defaultValue={tool?.quantity ?? 1}
                aria-invalid={Boolean(errors.quantity)}
              />
            </Field>

            <Field id="tool-condition" label="Kondisi" error={errors.condition}>
              <NativeSelect
                id="tool-condition"
                name="condition"
                defaultValue={tool?.condition ?? "GOOD"}
              >
                {Object.entries(toolConditionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Field
            id="tool-lastServicedAt"
            label="Servis / perawatan terakhir"
            error={errors.lastServicedAt}
            hint="Kosongkan kalau belum pernah"
          >
            <Input
              id="tool-lastServicedAt"
              name="lastServicedAt"
              type="date"
              defaultValue={
                tool?.lastServicedAt ? dateInputValue(tool.lastServicedAt) : ""
              }
            />
          </Field>

          <Field id="tool-notes" label="Catatan perawatan" error={errors.notes}>
            <Textarea
              id="tool-notes"
              name="notes"
              rows={2}
              defaultValue={tool?.notes ?? ""}
              placeholder="Nozzle bocor, sudah diganti karet sealnya"
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
            <SubmitButton>
              {editing ? "Simpan Perubahan" : "Simpan Alat"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
