"use client";

import { useState } from "react";
import { Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/common/submit-button";
import { useSaveAndRefresh } from "@/components/common/use-save-and-refresh";
import { BuyerFields } from "@/components/harvest/buyer-fields";
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
import type { BuyerKindValue } from "@/lib/buyers";
import { createBuyer, updateBuyer } from "@/server/actions/buyers";

/** Adds a buyer, or edits one — including filling in what a migrated one lacks. */
export function BuyerDialog({
  buyer,
  label,
}: {
  buyer?: {
    id: string;
    name: string;
    location: string | null;
    kind: BuyerKindValue | null;
    whatsapp: string | null;
  };
  /** Overrides the trigger's text, e.g. "Lengkapi data". */
  label?: string;
}) {
  const editing = Boolean(buyer);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { refreshing, finish } = useSaveAndRefresh();

  async function onSubmit(formData: FormData) {
    const result = editing ? await updateBuyer(formData) : await createBuyer(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    finish(editing ? "Data pembeli disimpan." : "Pembeli ditambahkan.", () => {
      setOpen(false);
      setErrors({});
    });
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
          <Button size="sm" variant={label ? "default" : "secondary"}>
            <Pencil className="size-4" aria-hidden />
            {label ?? "Ubah"}
          </Button>
        ) : (
          <Button size="sm">
            <UserPlus className="size-4" aria-hidden />
            Tambah Pembeli
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Ubah ${buyer!.name}` : "Tambah Pembeli"}</DialogTitle>
          <DialogDescription>
            Lokasi dan jenis wajib — keduanya yang membuat harga antarpembeli
            bisa dibandingkan.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          {editing ? <input type="hidden" name="buyerId" value={buyer!.id} /> : null}
          <BuyerFields defaults={buyer} errors={errors} />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <SubmitButton busy={refreshing}>Simpan</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
