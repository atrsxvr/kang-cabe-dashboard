import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Sprout, Wallet, Wheat } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { SummaryCard } from "@/components/common/summary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateHst, formatDate, formatDateRange } from "@/lib/hst";
import { readSeasonParam, withSeason } from "@/lib/season-param";
import { formatRupiah } from "@/lib/money";
import { HarvestChart } from "@/components/charts/harvest-chart";
import { AttentionCard } from "@/components/dashboard/attention-card";
import { HarvestBlockCard } from "@/components/dashboard/harvest-block-card";
import { StockCapacityCard } from "@/components/dashboard/stock-capacity-card";
import { TodayCard } from "@/components/dashboard/today-card";
import { WeatherCard } from "@/components/dashboard/weather-card";
import { countWeekendTasks, overview } from "@/server/queries/dashboard";
import { seasonMaterialCost } from "@/server/queries/finance";
import { harvestCurve, harvestSummary } from "@/server/queries/harvest";
import { getGardenProfile } from "@/server/queries/users";
import { getWeather } from "@/server/queries/weather";
import { resolveSeason } from "@/server/queries/seasons";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;

  // Reading searchParams already opts this page out of prerendering, so the
  // figures below are computed per request rather than frozen at build time.
  const season = await resolveSeason(readSeasonParam(searchParams));

  if (!season) return <NoSeason />;

  const [weekend, cost, harvest, curve, profile, board] = await Promise.all([
    countWeekendTasks(season.id),
    seasonMaterialCost(season.id),
    harvestSummary(season.id),
    harvestCurve(season.id, season.startDate),
    getGardenProfile(),
    overview(season.id),
  ]);

  // Fetched after the profile because it needs the coordinates, and skipped
  // entirely when they are not set — a missing forecast must never be the
  // reason this page fails.
  const weather =
    profile.latitude !== null && profile.longitude !== null
      ? await getWeather(profile.latitude, profile.longitude)
      : null;
  const currentHst = calculateHst(season.startDate);
  const notPlanted = season.status === "PLANNING";

  return (
    <>
      <PageHeader
        title="Dashboard Overview"
        description={`${season.name} · ditanam ${formatDate(season.startDate)}`}
      />

      <div className="mb-6">
        <StatusBadge status={season.status} kind="season" />
      </div>

      {/* Two up even on the narrowest phone: stacked full-width, these four
          numbers pushed everything actionable below the fold. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <SummaryCard
          title="Umur Tanaman"
          value={notPlanted ? "—" : String(currentHst)}
          unit={notPlanted ? undefined : "HST"}
          hint={
            notPlanted
              ? `Tanam dijadwalkan ${formatDate(season.startDate)}`
              : `${season.variety} · ${season.plantCount.toLocaleString("id-ID")} tanaman`
          }
          icon={Sprout}
        />

        <SummaryCard
          title="Tugas Weekend Ini"
          value={String(weekend.outstanding)}
          unit="tugas"
          hint={
            weekend.total === 0
              ? `Tidak ada jadwal ${formatDateRange(weekend.from, weekend.to)}`
              : `Sab–Min ${formatDateRange(weekend.from, weekend.to)} · ${weekend.total - weekend.outstanding} selesai`
          }
          icon={CalendarCheck}
        />

        <SummaryCard
          title="Habis Buat Bahan"
          value={formatRupiah(cost.total)}
          hint="Dari bahan yang kepakai di musim ini"
          icon={Wallet}
        />

        <SummaryCard
          title="Total Panen Sementara"
          value={harvest.totalHarvestedKg.toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          unit="kg"
          hint={
            harvest.lastHarvestAt
              ? `Terakhir petik ${formatDate(harvest.lastHarvestAt)}`
              : "Belum ada panen tercatat"
          }
          icon={Wheat}
        />
      </div>

      {/* Above everything else: the only mistake here whose consequence
          leaves the garden. */}
      <div className="mt-6">
        <HarvestBlockCard blocks={board.harvestBlocks} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TodayCard
          dueToday={board.dueToday}
          overdue={board.overdue}
          seasonId={season.id}
        />

        <AttentionCard
          awaitingDiagnosis={board.awaitingDiagnosis}
          unrecordedUsage={board.unrecordedUsage}
          outstanding={harvest.outstanding}
          outstandingCount={harvest.outstandingCount}
          seasonId={season.id}
        />

        <StockCapacityCard
          mixCapacity={board.mixCapacity}
          trend={board.harvestTrend}
        />

        <WeatherCard weather={weather} locationName={profile.locationName} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hasil panen musim ini</CardTitle>
          </CardHeader>
          <CardContent>
            <HarvestChart points={curve} />
            <Button asChild size="sm" variant="secondary" className="mt-3">
              <Link href={withSeason("/harvest", season.id)}>
                Buka Panen & Penjualan
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function NoSeason() {
  return (
    <>
      <PageHeader title="Dashboard Overview" />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="bg-muted rounded-lg p-3">
            <Sprout className="text-muted-foreground size-6" aria-hidden />
          </div>
          <div>
            <p className="font-medium">Belum ada musim tanam</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Ringkasan dihitung per musim, jadi buat musimnya dulu.
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
