import type { Metadata } from "next";
import Link from "next/link";
import { Coins, PackageMinus, Sprout, Users, Wrench } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { SeasonCompareChart } from "@/components/charts/season-compare-chart";
import { CapitalPanel } from "@/components/finance/capital-panel";
import { FinanceEntryDialog } from "@/components/finance/finance-entry-dialog";
import { FinanceEntryList } from "@/components/finance/finance-entry-list";
import { FinanceViews } from "@/components/finance/finance-views";
import { materialCategoryLabels } from "@/components/inventory/inventory-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatKg } from "@/lib/harvest";
import { formatRupiah } from "@/lib/money";
import { readSeasonParam } from "@/lib/season-param";
import {
  listFinanceEntries,
  profitSharing,
  seasonComparison,
  seasonMaterialCost,
  seasonResult,
  toolSpend,
} from "@/server/queries/finance";
import type { CostLine } from "@/server/queries/finance";
import { capitalSummary, listContributions } from "@/server/queries/capital";
import { listSeasons, resolveSeason } from "@/server/queries/seasons";
import { listActiveMembers } from "@/server/queries/users";
import { isPhotoUploadEnabled } from "@/server/storage";

export const metadata: Metadata = { title: "Keuangan & Kas" };

export default async function FinancePage(props: PageProps<"/finance">) {
  const searchParams = await props.searchParams;

  // Reading searchParams already opts this page out of prerendering.
  const season = await resolveSeason(readSeasonParam(searchParams));

  if (!season) return <NoSeason />;

  const [
    cost,
    tools,
    result,
    entries,
    sharing,
    seasons,
    capital,
    contributions,
    members,
    seasonList,
  ] = await Promise.all([
    seasonMaterialCost(season.id),
    toolSpend(),
    seasonResult(season.id),
    listFinanceEntries(season.id),
    profitSharing(season.id),
    seasonComparison(),
    capitalSummary(),
    listContributions(),
    listActiveMembers(),
    listSeasons(),
  ]);

  const photoEnabled = isPhotoUploadEnabled();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Keuangan & Kas"
          description={`${season.name} · uang masuk dari penjualan, uang keluar dari bahan dan catatan manual`}
        />
        <FinanceEntryDialog seasonId={season.id} photoEnabled={photoEnabled} />
      </div>

      <Card className="mb-6">
        <CardContent className="grid gap-4 py-6">
          <div className="grid gap-1 text-center">
            <p className="text-muted-foreground text-sm">
              Sisa musim ini
            </p>
            <p
              className={
                result.margin < 0
                  ? "text-destructive text-3xl font-semibold tabular-nums"
                  : "text-3xl font-semibold tabular-nums"
              }
            >
              {formatRupiah(result.margin)}
            </p>
            <p className="text-muted-foreground mx-auto max-w-md text-xs">
              Uang masuk dikurangi semua biaya yang tercatat. Seakurat apa yang
              kalian catat — kalau ada upah yang belum diketik, angka ini masih
              kebesaran.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t pt-4 text-center">
            <div>
              <p className="text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatRupiah(result.income)}
              </p>
              <p className="text-muted-foreground text-xs">Masuk</p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                {formatRupiah(result.salesIncome)} jualan
                {result.otherIncome > 0
                  ? ` · ${formatRupiah(result.otherIncome)} lain`
                  : ""}
              </p>
              {result.outstanding > 0 ? (
                <p className="text-muted-foreground text-[11px]">
                  {formatRupiah(result.outstanding)} masih ditagih
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-destructive text-lg font-semibold tabular-nums">
                {formatRupiah(result.totalCost)}
              </p>
              <p className="text-muted-foreground text-xs">Keluar</p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                {formatRupiah(result.materialCost)} bahan
                {result.otherCost > 0
                  ? ` · ${formatRupiah(result.otherCost)} lain`
                  : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {cost.unpricedUsages > 0 ? (
        <p className="text-muted-foreground mb-4 text-xs">
          {cost.unpricedUsages} pemakaian tercatat waktu bahannya belum ada
          harga, jadi masuk hitungan sebagai Rp 0. Isi harga belanjanya di
          Inventaris.
        </p>
      ) : null}

      <FinanceViews
        entryCount={entries.length}
        summary={
          <div className="grid gap-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Breakdown
                title="Semua yang keluar"
                icon={PackageMinus}
                lines={result.costByCategory}
                total={result.totalCost}
                empty="Belum ada pengeluaran tercatat di musim ini."
              />
              <Breakdown
                title="Bahan, per jenis"
                icon={Sprout}
                lines={cost.byCategory.map((line) => ({
                  ...line,
                  label: materialCategoryLabels[line.label] ?? line.label,
                }))}
                total={cost.total}
                empty="Belum ada pemakaian bahan tercatat."
              />
            </div>

            <Card>
              <CardContent className="grid gap-3 py-5">
                <div className="flex items-center gap-2">
                  <Wrench className="text-muted-foreground size-4" aria-hidden />
                  <h2 className="text-sm font-medium">Uang keluar buat alat</h2>
                </div>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatRupiah(tools.total)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatRupiah(tools.bought)} beli · {formatRupiah(tools.serviced)}{" "}
                  servis. Dihitung semua musim, bukan per musim — cangkul kepakai
                  terus, nggak habis kayak pupuk, jadi nggak ikut masuk hitungan
                  sisa musim di atas.
                </p>
              </CardContent>
            </Card>
          </div>
        }
        entries={
          <FinanceEntryList
            entries={entries}
            seasonId={season.id}
            photoEnabled={photoEnabled}
          />
        }
        capital={
          <CapitalPanel
            summary={capital}
            contributions={contributions}
            members={members}
            seasons={seasonList}
            photoEnabled={photoEnabled}
          />
        }
        sharing={
          <Card>
            <CardContent className="grid gap-4 py-5">
              <div className="flex items-center gap-2">
                <Users className="text-muted-foreground size-4" aria-hidden />
                <h2 className="text-sm font-medium">
                  Bagi hasil {formatRupiah(Math.max(0, sharing.margin))}
                </h2>
              </div>

              {sharing.margin <= 0 ? (
                <p className="text-muted-foreground text-sm">
                  Musim ini belum ada sisa buat dibagi.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {sharing.rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">{row.name}</span>
                      <span className="flex items-center gap-3">
                        <Badge variant="secondary" className="tabular-nums">
                          {row.share}%
                        </Badge>
                        <strong className="tabular-nums">
                          {formatRupiah(row.amount)}
                        </strong>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Not normalised on purpose: a gap in the agreed shares is a
                  conversation the four of them need to have, and inflating
                  everyone's slice to hide it would settle it for them. */}
              {sharing.totalShare !== 100 ? (
                <p className="text-amber-700 text-xs dark:text-amber-400">
                  Porsinya baru {sharing.totalShare}%, belum genap 100
                  {sharing.unallocated > 0
                    ? ` — ${formatRupiah(sharing.unallocated)} belum ada yang punya`
                    : ""}
                  . Atur di Settings & Users.
                </p>
              ) : null}
            </CardContent>
          </Card>
        }
        seasons={
          <div className="grid gap-6">
            <Card>
              <CardContent className="py-5">
                <h2 className="mb-3 text-sm font-medium">
                  Masuk vs keluar per musim
                </h2>
                <SeasonCompareChart seasons={seasons} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="grid gap-2 py-5">
                <h2 className="text-sm font-medium">Per kilo panen</h2>
                <p className="text-muted-foreground text-xs">
                  Musim yang jalan lebih lama otomatis dapat angka lebih besar,
                  jadi angka total nggak adil dibandingkan. Sisa per kilo panen
                  yang bisa.
                </p>
                <ul className="mt-2 grid gap-2">
                  {seasons.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="min-w-0">
                        {row.name}
                        <span className="text-muted-foreground ml-2 text-xs">
                          {formatKg(row.harvestedKg)}
                        </span>
                      </span>
                      <strong
                        className={
                          row.perKg < 0
                            ? "text-destructive tabular-nums"
                            : "tabular-nums"
                        }
                      >
                        {formatRupiah(row.perKg)}/kg
                      </strong>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        }
      />
    </>
  );
}

function Breakdown({
  title,
  icon: Icon,
  lines,
  total,
  empty,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  lines: CostLine[];
  total: number;
  empty: string;
}) {
  return (
    <Card>
      <CardContent className="grid gap-3 py-5">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground size-4" aria-hidden />
          <h2 className="text-sm font-medium">{title}</h2>
        </div>

        {lines.length === 0 ? (
          <p className="text-muted-foreground text-sm">{empty}</p>
        ) : (
          <ul className="grid gap-3">
            {lines.map((line) => {
              // Share of the season's spend, so the big items stand out
              // without anyone doing the division in their head.
              const share = total > 0 ? (line.amount / total) * 100 : 0;

              return (
                <li key={line.key} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{line.label}</span>
                    <span className="font-medium tabular-nums">
                      {formatRupiah(line.amount)}
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {line.detail} · {Math.round(share)}%
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function NoSeason() {
  return (
    <>
      <PageHeader title="Keuangan & Kas" />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="bg-muted rounded-lg p-3">
            <Coins className="text-muted-foreground size-6" aria-hidden />
          </div>
          <div>
            <p className="font-medium">Belum ada musim tanam</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Biaya selalu dihitung per musim, jadi buat musimnya dulu.
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
