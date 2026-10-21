import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";

import { CanWrite } from "@/components/auth/can-write";
import { ConfirmDelete } from "@/components/common/confirm-delete";
import { BuyerDialog } from "@/components/harvest/buyer-dialog";
import { BuyerMergeDialog } from "@/components/harvest/buyer-merge-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buyerKindLabels, waNumber } from "@/lib/buyers";
import { formatKg, gradeLabels } from "@/lib/harvest";
import { formatDate } from "@/lib/hst";
import { formatRupiah } from "@/lib/money";
import { readSeasonParam, withSeason } from "@/lib/season-param";
import { deleteBuyer } from "@/server/actions/buyers";
import { buyerOptions, getBuyer } from "@/server/queries/buyers";

export const metadata: Metadata = { title: "Pembeli" };

/**
 * One buyer across every season: who they are, what they have bought, and at
 * what price — the history that answers "is this offer good for them?".
 */
export default async function BuyerPage(props: PageProps<"/harvest/pembeli/[buyerId]">) {
  const [{ buyerId }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  const [buyer, options] = await Promise.all([getBuyer(buyerId), buyerOptions()]);
  if (!buyer) notFound();

  const back = withSeason("/harvest", readSeasonParam(searchParams));
  const wa = waNumber(buyer.whatsapp);
  const others = options.filter((option) => option.id !== buyer.id);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href={back}>
          <ArrowLeft className="size-4" aria-hidden />
          Panen & Penjualan
        </Link>
      </Button>

      <div className="mb-6 grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{buyer.name}</h1>
          {buyer.kind ? (
            <Badge variant="secondary">{buyerKindLabels[buyer.kind]}</Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-sm">
          {buyer.location ?? "Lokasi belum diisi"}
          {buyer.whatsapp ? ` · ${buyer.whatsapp}` : ""}
        </p>

        {buyer.incomplete ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
            Pembeli ini dipindahkan dari nama yang dulu diketik bebas. Lengkapi
            lokasi dan jenisnya — kalau ternyata orang yang sama dengan pembeli
            lain, gabungkan saja.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {wa ? (
            <Button asChild size="sm">
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
            </Button>
          ) : null}
          <CanWrite area="harvest">
            <BuyerDialog
              buyer={buyer}
              label={buyer.incomplete ? "Lengkapi data" : undefined}
            />
            <BuyerMergeDialog
              buyer={buyer}
              saleCount={buyer.saleCount}
              others={others}
            />
            {/* Only a buyer who never bought can go: their sales would lose
                who bought them. Everyone else is merged, not deleted. */}
            {buyer.saleCount === 0 ? (
              <ConfirmDelete
                title="Hapus pembeli ini?"
                itemName={buyer.name}
                consequence="belum pernah membeli, jadi tidak ada penjualan yang ikut terhapus"
                action={deleteBuyer}
                fields={{ buyerId: buyer.id }}
                redirectTo={back}
              />
            ) : null}
          </CanWrite>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Tile value={`${buyer.saleCount}×`} label="Membeli" />
        <Tile value={formatRupiah(buyer.totalAmount)} label="Total dibayar" />
        <Tile
          value={
            buyer.averageGoodPrice !== null
              ? `${formatRupiah(buyer.averageGoodPrice)}/kg`
              : "—"
          }
          label={`Rata-rata ${gradeLabels.GOOD}`}
          hint={`${formatKg(buyer.goodKg)} ${gradeLabels.GOOD.toLowerCase()}`}
        />
        <Tile
          value={buyer.lastSoldAt ? formatDate(buyer.lastSoldAt) : "—"}
          label="Terakhir membeli"
        />
      </div>

      <section className="grid gap-3">
        <h2 className="text-sm font-medium">Riwayat harga</h2>
        {buyer.sales.length === 0 ? (
          <p className="text-muted-foreground text-sm">Belum ada penjualan ke pembeli ini.</p>
        ) : (
          buyer.sales.map((sale) => (
            <Card key={sale.id} className="py-3">
              <CardContent className="grid gap-1 px-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{formatDate(sale.soldAt)}</span>
                  <strong className="tabular-nums">{formatRupiah(sale.totalAmount)}</strong>
                </div>
                <ul className="grid gap-0.5 text-sm">
                  {sale.items.map((item) => (
                    <li key={item.grade} className="flex justify-between gap-2 tabular-nums">
                      <span className="text-muted-foreground">
                        {gradeLabels[item.grade]} · {formatKg(item.weightKg)}
                      </span>
                      <span>{formatRupiah(item.pricePerKg)}/kg</span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground text-xs">
                  <Link
                    href={withSeason("/harvest", sale.season.id)}
                    className="underline-offset-2 hover:underline"
                  >
                    {sale.season.name}
                  </Link>
                  {sale.isPaid ? " · lunas" : " · belum dibayar"}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </>
  );
}

function Tile({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <Card className="py-3">
      <CardContent className="grid gap-0.5 px-3">
        <p className="text-base font-semibold tabular-nums sm:text-lg">{value}</p>
        <p className="text-muted-foreground text-xs">{label}</p>
        {hint ? <p className="text-muted-foreground text-[11px]">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
