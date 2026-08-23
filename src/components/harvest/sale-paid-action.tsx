"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { markSalePaid } from "@/server/actions/harvest";
import type { SaleRow } from "@/server/queries/harvest";

/**
 * Its own button rather than a trip through the edit form: chasing a pengepul
 * for payment is a different job from correcting what was sold, and it happens
 * weeks after the load left.
 */
export function SalePaidAction({
  sale,
  seasonId,
}: {
  sale: SaleRow;
  seasonId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("saleId", sale.id);
      formData.set("seasonId", seasonId);
      if (sale.isPaid) formData.set("unpaid", "true");

      const result = await markSalePaid(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(
        sale.isPaid
          ? "Ditandai belum dibayar lagi."
          : `Pembayaran ${sale.buyerName} tercatat.`,
      );
      router.refresh();
    });
  };

  return (
    <Button
      size="sm"
      variant={sale.isPaid ? "ghost" : "default"}
      disabled={pending}
      onClick={submit}
    >
      {sale.isPaid ? (
        <>
          <Undo2 className="size-4" aria-hidden />
          Batalkan lunas
        </>
      ) : (
        <>
          <BadgeCheck className="size-4" aria-hidden />
          Tandai lunas
        </>
      )}
    </Button>
  );
}
