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
import { formatKg, formatKgPrecise, gradeLabels } from "@/lib/harvest";
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
import { resolveSeason } from "@/server/queries/seasons";
import { listActiveMembers } from "@/server/queries/users";

export const metadata: Metadata = { title: "Panen & Penjualan" };

export default async function HarvestPage(props: PageProps<"/harvest">) {
  const searchParams = await props.searchParams;

  // Reading searchParams already opts this page out of prerendering.
  const season = await resolveSeason(readSeasonParam(searchParams));

  if (!season) return <NoSeason />;

  const [harvests, sales, summary, members, buyers, curve] = await Promise.all([
    listHarvests(season.id),
    listSales(season.id),
    harvestSummary(season.id),
    listActiveMembers(),
    buyerSuggestions(),
    harvestCurve(season.id, season.startDate),
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
          <SaleDialog
            seasonId={season.id}
            members={members}
            buyers={buyers}
          />
          <HarvestDialog seasonId={season.id} members={members} />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={season.status} kind="season" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Tile
          value={formatKgPrecise(summary.totalHarvestedKg)}
          label="Total panen"
          hint={`${gradeLabels.GOOD} ${formatKg(summary.harvested.GOOD)} · ${gradeLabels.REJECT} ${formatKg(summary.harvested.REJECT)}`}
        />
        <Tile
          value={formatKgPrecise(summary.totalSoldKg)}
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
      </div>

      {/* What is picked but not yet gone. Negative means a picking has not
          been written down, which is worth saying out loud rather than
          hiding behind a zero. */}
      <div className="mb-6 rounded-lg border px-3 py-2 text-sm">
        <p className="text-muted-foreground mb-1 text-xs font-medium">
          Sisa belum terjual
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
          <span>
            {gradeLabels.GOOD}{" "}
            <strong
              className={
                summary.unsold.GOOD < 0 ? "text-destructive" : undefined
              }
            >
              {formatKg(summary.unsold.GOOD)}
            </strong>
          </span>
          <span>
            {gradeLabels.REJECT}{" "}
            <strong
              className={
                summary.unsold.REJECT < 0 ? "text-destructive" : undefined
              }
            >
              {formatKg(summary.unsold.REJECT)}
            </strong>
          </span>
        </p>
        {summary.unsold.GOOD < 0 || summary.unsold.REJECT < 0 ? (
          <p className="text-destructive mt-1 text-xs">
            Tercatat terjual lebih banyak dari yang dipanen — kayaknya ada
            panen yang belum sempat dicatat.
          </p>
        ) : null}
      </div>

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
            sales={sales}
            seasonId={season.id}
            members={members}
            buyers={buyers}
            empty="Belum ada penjualan tercatat di musim ini."
          />
        }
        unpaid={
          <SaleList
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
