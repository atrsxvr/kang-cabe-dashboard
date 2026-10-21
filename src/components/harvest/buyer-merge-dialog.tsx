"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Merge } from "lucide-react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/common/native-select";
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
import { Label } from "@/components/ui/label";
import { buyerKindLabels } from "@/lib/buyers";
import { mergeBuyer } from "@/server/actions/buyers";
import type { BuyerOption } from "@/server/queries/buyers";

/**
 * Folds this buyer into another — for the same person typed two ways before
 * there was a list, or entered twice since.
 *
 * Merging and not renaming: the two may each carry sales, and every one of
 * them has to end up under the one buyer that stays.
 */
export function BuyerMergeDialog({
  buyer,
  saleCount,
  others,
}: {
  buyer: { id: string; name: string };
  saleCount: number;
  others: BuyerOption[];
}) {
  const [open, setOpen] = useState(false);
  const [intoId, setIntoId] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const target = others.find((other) => other.id === intoId);

  const merge = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("fromId", buyer.id);
      formData.set("intoId", intoId);
      const result = await mergeBuyer(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(`${buyer.name} digabung ke ${target?.name ?? "pembeli tujuan"}.`);
      setOpen(false);
      // This buyer no longer exists; the one that stays is where its sales are.
      router.replace(`/harvest/pembeli/${intoId}`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" disabled={others.length === 0}>
          <Merge className="size-4" aria-hidden />
          Gabungkan
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gabungkan {buyer.name}</DialogTitle>
          <DialogDescription>
            Untuk orang yang sama yang tercatat dua kali. Semua penjualannya pindah
            ke pembeli yang dipilih, lalu {buyer.name} dihapus dari daftar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="merge-into">Gabungkan ke</Label>
          <NativeSelect
            id="merge-into"
            value={intoId}
            onChange={(event) => setIntoId(event.target.value)}
          >
            <option value="" disabled>
              — pilih pembeli —
            </option>
            {others.map((other) => (
              <option key={other.id} value={other.id}>
                {other.name}
                {other.kind ? ` · ${buyerKindLabels[other.kind]}` : ""}
                {other.location ? ` · ${other.location}` : ""}
              </option>
            ))}
          </NativeSelect>
          {target ? (
            <p className="text-muted-foreground text-xs">
              {saleCount} penjualan {buyer.name} akan tercatat atas nama{" "}
              <span className="text-foreground font-medium">{target.name}</span>.
              Tidak bisa dibatalkan.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Batal
          </Button>
          <Button onClick={merge} disabled={!intoId || pending}>
            {pending ? "Menggabungkan…" : "Gabungkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
