import { Coins } from "lucide-react";

import { ConfirmDelete } from "@/components/common/confirm-delete";
import { SaleDialog } from "@/components/harvest/sale-dialog";
import { SalePaidAction } from "@/components/harvest/sale-paid-action";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/hst";
import { formatKg, gradeLabels, gradeTones } from "@/lib/harvest";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deleteSale } from "@/server/actions/harvest";
import type { SaleRow } from "@/server/queries/harvest";
import type { MemberOption } from "@/server/queries/users";

export function SaleList({
  sales,
  seasonId,
  members,
  buyers,
  empty,
}: {
  sales: SaleRow[];
  seasonId: string;
  members: MemberOption[];
  buyers: string[];
  empty: string;
}) {
  if (sales.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="bg-muted rounded-lg p-3">
            <Coins className="text-muted-foreground size-6" aria-hidden />
          </div>
          <p className="text-muted-foreground text-sm">{empty}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {sales.map((sale) => (
        <Card key={sale.id} className="py-3">
          <CardContent className="grid gap-2 px-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{sale.buyerName}</p>
                <p className="text-muted-foreground text-xs">
                  {formatDate(sale.soldAt)}
                  {sale.recordedBy ? ` · ${sale.recordedBy.name}` : null}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums">
                  {formatRupiah(sale.totalAmount)}
                </p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatKg(sale.totalKg)}
                </p>
                {sale.rounding > 0 ? (
                  <p className="text-muted-foreground text-[11px] tabular-nums">
                    {formatRupiah(sale.subtotal)} +{" "}
                    {formatRupiah(sale.rounding)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {sale.items.map((item) => (
                <Badge
                  key={item.id}
                  variant="secondary"
                  className={cn("border-transparent", gradeTones[item.grade])}
                >
                  {gradeLabels[item.grade]} {formatKg(item.weightKg)} ·{" "}
                  {formatRupiah(item.pricePerKg)}/kg
                </Badge>
              ))}

              {sale.isPaid ? (
                <Badge
                  variant="secondary"
                  className="border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                >
                  Lunas{sale.paidAt ? ` ${formatDate(sale.paidAt)}` : ""}
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-400"
                >
                  Belum dibayar
                </Badge>
              )}
            </div>

            {sale.notes ? (
              <p className="text-muted-foreground text-xs">{sale.notes}</p>
            ) : null}

            <div className="flex items-center gap-1 border-t pt-2">
              <SalePaidAction sale={sale} seasonId={seasonId} />
              <div className="ml-auto flex items-center gap-1">
                <SaleDialog
                  seasonId={seasonId}
                  members={members}
                  buyers={buyers}
                  sale={sale}
                />
                <ConfirmDelete
                  title="Hapus penjualan ini?"
                  itemName={`${sale.buyerName} · ${formatDate(sale.soldAt)}`}
                  consequence="Pemasukan musim dan sisa panen ikut berubah."
                  action={deleteSale}
                  fields={{ saleId: sale.id, seasonId }}
                  iconOnly
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
