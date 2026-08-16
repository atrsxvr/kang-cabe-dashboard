import type { Metadata } from "next";
import Link from "next/link";
import { Wheat } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { HarvestChart } from "@/components/charts/harvest-chart";
import { HarvestDialog } from "@/components/harvest/harvest-dialog";
import { HarvestList } from "@/components/harvest/harvest-list";
import { HarvestViews } from "@/components/harvest/harvest-views";
import { SaleDialog } from "@/components/harvest/sale-dialog";
import { SaleList } from "@/components/harvest/sale-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LossDialog } from "@/components/harvest/loss-dialog";
import {
  formatKg,
  formatKgPrecise,
  formatPercent,
  formatPerPlant,
  gradeLabels,
} from "@/lib/harvest";
import { formatDate } from "@/lib/hst";
import { formatRupiah } from "@/lib/money";
import { readSeasonParam } from "@/lib/season-param";
import {
  buyerSuggestions,
  harvestCurve,
  harvestSummary,
  listHarvests,
  listSales,
} from "@/server/queries/harvest";
import { pricingGuide } from "@/server/queries/finance";
import { resolveSeason } from "@/server/queries/seasons";
import { listActiveMembers } from "@/server/queries/users";

export const metadata: Metadata = { title: "Panen & Penjualan" };

export default async function HarvestPage(props: PageProps<"/harvest">) {
  const searchParams = await props.searchParams;

  // Reading searchParams already opts this page out of prerendering.
  const season = await resolveSeason(readSeasonParam(searchParams));

  if (!season) return <NoSeason />;

  const [harvests, sales, summary, members, buyers, curve, pricing] =
    await Promise.all([
      listHarvests(season.id),
      listSales(season.id),
      harvestSummary(season.id),
      listActiveMembers(),
      buyerSuggestions(),
      harvestCurve(season.id, season.startDate),
      pricingGuide(season.id),
    ]);

  const unpaid = sales.filter((sale) => !sale.isPaid);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Panen & Penjualan"
          description={`${season.name} · ${
            summary.lastHarvestAt
              ? `panen terakhir ${formatDate(summary.lastHarvestAt)}`
              : "belum ada panen tercatat"
          }`}
        />
        <div className="flex flex-wrap gap-2">
          <LossDialog seasonId={season.id} members={members} />
          <SaleDialog
            seasonId={season.id}
            members={members}
            buyers={buyers}
            projectedBep={pricing.projectedBep}
          />
          <HarvestDialog seasonId={season.id} members={members} />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={season.status} kind="season" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
        {/* Bagus only. Afkir has never sold, so counting it into the headline
            would inflate a figure the money side cannot back. */}
        <Tile
          value={formatKgPrecise(summary.sellableHarvestedKg)}
          label="Panen layak jual"
          hint={`${formatPercent(summary.gradeOutRate)} dari ${formatKg(summary.totalHarvestedKg)} total`}
        />
        <Tile
          value={formatKgPrecise(summary.sellableSoldKg)}
          label="Sudah terjual"
          hint={
            summary.averagePricePerKg > 0
              ? `rata-rata ${formatRupiah(summary.averagePricePerKg)}/kg`
              : undefined
          }
        />
        <Tile
          value={formatRupiah(summary.income)}
          label="Pemasukan"
          hint={`${formatRupiah(summary.received)} sudah masuk`}
        />
        <Tile
          value={formatRupiah(summary.outstanding)}
          label="Belum dibayar"
          hint={
            summary.outstandingCount > 0
              ? `${summary.outstandingCount} penjualan`
              : "semua lunas"
          }
          warn={summary.outstanding > 0}
        />

        <Tile
          value={String(summary.sessionCount)}
          label="Sesi petik"
          hint={
            summary.sessionCount > 0
              ? `rata-rata ${formatKg(summary.averagePerSessionKg)} sekali petik`
              : "belum ada petikan"
          }
        />

        {/* The one figure that compares fairly across seasons: a planting with
            twice the population will out-yield another without being better at
            anything. */}
        <Tile
          value={formatPerPlant(
            summary.sellableHarvestedKg,
            summary.actualPlantCount
          )}
          label="Hasil layak per pohon"
          hint={
            summary.actualPlantCount > 0
              ? `dari ${formatPerPlant(summary.totalHarvestedKg, summary.actualPlantCount)} total · ${summary.actualPlantCount.toLocaleString("id-ID")} pohon`
              : "populasi musim ini belum diisi"
          }
        />
      </div>

      {/* Bagus is stock with a price on it. Afkir is reported in kilos and
          left at zero: none has ever sold, so pricing it would invent an
          asset. If the sambal plan works, the numbers move on their own. */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border px-3 py-2 text-sm">
          <p className="text-muted-foreground mb-1 text-xs font-medium">
            Sisa {gradeLabels.GOOD} — stok yang bisa dijual
          </p>
          <p className="text-lg font-semibold tabular-nums">
            <span
              className={
                summary.sellableUnsoldKg < 0 ? "text-destructive" : undefined
              }
            >
              {formatKg(summary.sellableUnsoldKg)}
            </span>
          </p>
          <p className="text-muted-foreground text-xs">
            {formatKg(summary.harvested.GOOD)} dipetik ·{" "}
            {formatKg(summary.sold.GOOD)} terjual
            {summary.lost.GOOD > 0
              ? ` · ${formatKg(summary.lost.GOOD)} susut`
              : ""}
          </p>
        </div>

        <div className="rounded-lg border px-3 py-2 text-sm">
          <p className="text-muted-foreground mb-1 text-xs font-medium">
            {gradeLabels.REJECT} — dilaporkan saja
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {formatKg(summary.unsold.REJECT)}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatKg(summary.harvested.REJECT)} dipetik ·{" "}
            {summary.rejectIncome > 0
              ? `${formatRupiah(summary.rejectIncome)} masuk sebagai bonus`
              : "belum ada yang terjual"}
          </p>
        </div>
      </div>

      {summary.sellableUnsoldKg < 0 || summary.unsold.REJECT < 0 ? (
        <p className="text-destructive mb-6 text-xs">
          Tercatat keluar lebih banyak dari yang dipanen — kayaknya ada petikan
          yang belum sempat dicatat.
        </p>
      ) : null}

      <HarvestViews
        unpaidCount={unpaid.length}
        harvest={
          <div className="grid gap-6">
            {curve.length > 1 ? (
              <Card>
                <CardContent className="py-5">
                  <h2 className="mb-1 text-sm font-medium">
                    Hasil panen per umur tanaman
                  </h2>
                  <p className="text-muted-foreground mb-3 text-xs">
                    Sumbu bawahnya HST, bukan tanggal — biar musim berikutnya
                    bisa ditumpuk di atasnya buat dibandingkan.
                  </p>
                  <HarvestChart points={curve} />
                </CardContent>
              </Card>
            ) : null}

            <HarvestList
            harvests={harvests}
            seasonId={season.id}
            seasonStart={season.startDate}
            members={members}
          />
          </div>
        }
        sales={
          <SaleList
            projectedBep={pricing.projectedBep}
            sales={sales}
            seasonId={season.id}
            members={members}
            buyers={buyers}
            empty="Belum ada penjualan tercatat di musim ini."
          />
        }
        unpaid={
          <SaleList
            projectedBep={pricing.projectedBep}
            sales={unpaid}
            seasonId={season.id}
            members={members}
            buyers={buyers}
            empty="Nggak ada tagihan yang menggantung. Semua sudah dibayar."
          />
        }
      />
    </>
  );
}

function Tile({
  value,
  label,
  hint,
  warn = false,
}: {
  value: string;
  label: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border px-2 py-1.5 sm:px-3 sm:py-2">
      <p
        className={
          warn
            ? "text-base font-semibold tabular-nums text-rose-700 sm:text-lg dark:text-rose-400"
            : "text-base font-semibold tabular-nums sm:text-lg"
        }
      >
        {value}
      </p>
      <p className="text-muted-foreground text-[11px] leading-tight sm:text-xs">
        {label}
      </p>
      {hint ? (
        <p className="text-muted-foreground mt-0.5 text-[10px] leading-tight sm:text-[11px]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function NoSeason() {
  return (
    <>
      <PageHeader title="Panen & Penjualan" />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="bg-muted rounded-lg p-3">
            <Wheat className="text-muted-foreground size-6" aria-hidden />
          </div>
          <div>
            <p className="font-medium">Belum ada musim tanam</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Panen selalu melekat pada satu musim, jadi buat musimnya dulu.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/seasons">Ke Manajemen Musim</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
