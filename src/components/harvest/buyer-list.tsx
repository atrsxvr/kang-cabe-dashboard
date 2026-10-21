import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";

import { CanWrite } from "@/components/auth/can-write";
import { BuyerDialog } from "@/components/harvest/buyer-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buyerKindLabels } from "@/lib/buyers";
import { formatKg } from "@/lib/harvest";
import { formatDate } from "@/lib/hst";
import { formatRupiah } from "@/lib/money";
import type { BuyerRow } from "@/server/queries/buyers";

/**
 * Every buyer, across all seasons. Those still missing their location or
 * kind — brought over from the old free-typed names — come first, flagged,
 * since they are the ones waiting on someone.
 */
export function BuyerList({ buyers }: { buyers: BuyerRow[] }) {
  const incomplete = buyers.filter((buyer) => buyer.incomplete).length;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {buyers.length === 0
            ? "Belum ada pembeli."
            : `${buyers.length} pembeli, semua musim.`}
          {incomplete > 0 ? (
            <span className="text-amber-700 dark:text-amber-400">
              {" "}
              {incomplete} perlu dilengkapi.
            </span>
          ) : null}
        </p>
        <CanWrite area="harvest">
          <BuyerDialog />
        </CanWrite>
      </div>

      {buyers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Users className="text-muted-foreground size-6" aria-hidden />
            <p className="text-muted-foreground text-sm">
              Pembeli juga bisa ditambahkan langsung dari form Catat Penjualan.
            </p>
          </CardContent>
        </Card>
      ) : (
        buyers.map((buyer) => (
          <Link
            key={buyer.id}
            href={`/harvest/pembeli/${buyer.id}`}
            className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none"
          >
            <Card className="hover:bg-muted/40 py-3 transition-colors">
              <CardContent className="flex items-center gap-3 px-4">
                <div className="grid min-w-0 flex-1 gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{buyer.name}</span>
                    {buyer.kind ? (
                      <Badge variant="secondary">{buyerKindLabels[buyer.kind]}</Badge>
                    ) : null}
                    {buyer.incomplete ? (
                      <Badge className="border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300">
                        Lengkapi data
                      </Badge>
                    ) : null}
                  </div>
                  {buyer.location ? (
                    <p className="text-muted-foreground text-xs">{buyer.location}</p>
                  ) : null}
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {buyer.saleCount === 0
                      ? "Belum pernah membeli"
                      : [
                          `${buyer.saleCount}× beli`,
                          formatKg(buyer.totalKg),
                          formatRupiah(buyer.totalAmount),
                          buyer.averageGoodPrice !== null
                            ? `Bagus rata-rata ${formatRupiah(buyer.averageGoodPrice)}/kg`
                            : null,
                          buyer.lastSoldAt ? `terakhir ${formatDate(buyer.lastSoldAt)}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
              </CardContent>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
