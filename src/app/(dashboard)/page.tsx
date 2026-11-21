import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Sprout, Wallet, Wheat } from "lucide-react";

import { LiveRefresh } from "@/components/common/live-refresh";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { SummaryCard } from "@/components/common/summary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateHst, formatDate, formatDateRange } from "@/lib/hst";
import { readSeasonParam, withSeason } from "@/lib/season-param";
import { HarvestChart } from "@/components/charts/harvest-chart";
import { AttentionCard } from "@/components/dashboard/attention-card";
import { HarvestBlockCard } from "@/components/dashboard/harvest-block-card";
import { StockCapacityCard } from "@/components/dashboard/stock-capacity-card";
import { TodayCard } from "@/components/dashboard/today-card";
import { WeatherCard } from "@/components/dashboard/weather-card";
import { canWrite } from "@/lib/permissions";
import { isSeasonClosed } from "@/lib/season-close";
import { currentActor } from "@/server/auth/guard";
import { countWeekTasks, overview } from "@/server/queries/dashboard";
import { seasonMaterialCost } from "@/server/queries/finance";
import { harvestCurve, harvestSummary } from "@/server/queries/harvest";
import { getWeather } from "@/server/queries/weather";
import { resolveSeason } from "@/server/queries/seasons";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;

  // Reading searchParams already opts this page out of prerendering, so the
  // figures below are computed per request rather than frozen at build time.
  const season = await resolveSeason(readSeasonParam(searchParams));

  if (!season) return <NoSeason />;

  const profile = season.garden;
  const [week, cost, harvest, curve, board, actor] = await Promise.all([
    countWeekTasks(season.id),
    seasonMaterialCost(season.id),
    harvestSummary(season.id),
    harvestCurve(season.id, season.startDate),
    overview(season.id),
    currentActor(),
  ]);

  // The plot this season is planted on decides the forecast. Fetched after it
  // because it needs that plot's BMKG region code,
  // and skipped entirely when that is not set — a missing forecast must never
  // be the reason this page fails.
  const weather = profile.bmkgAdm4
    ? await getWeather(profile.bmkgAdm4)
    : null;
  const currentHst = calculateHst(season.startDate);
  const notPlanted = season.status === "PLANNING";

  return (
    <>
      {/* Dashboard dibiarkan terbuka di HP; tanpa ini cuaca dan tugas yang
          tampil adalah yang terakhir dimuat, bisa dari kemarin. */}
      <LiveRefresh />
      {/* The season's stage beside the title, not on a row of its own: on a
          phone that row was 44px between the heading and the numbers. */}
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Ringkasan Kebun"
          description={`${season.name} · ditanam ${formatDate(season.startDate)}`}
        />
        <StatusBadge
          status={season.status}
          kind="season"
          className="mt-1.5 shrink-0"
        />
      </div>

      {/* Two up even on the narrowest phone: stacked full-width, these four
          numbers pushed everything actionable below the fold. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <SummaryCard
          title="Umur Tanaman"
          value={notPlanted ? "—" : String(currentHst)}
          count={notPlanted ? undefined : { to: currentHst }}
          unit={notPlanted ? undefined : "HST"}
          hint={
            notPlanted
              ? `Tanam dijadwalkan ${formatDate(season.startDate)}`
              : `${season.variety} · ${season.plantCount.toLocaleString("id-ID")} tanaman`
          }
          icon={Sprout}
        />

        <SummaryCard
          title="Tugas Minggu Ini"
          value={String(week.outstanding)}
          count={{ to: week.outstanding }}
          unit="belum selesai"
          hint={
            week.total === 0
              ? `Tidak ada jadwal ${formatDateRange(week.from, week.to)}`
              : `Sen–Min ${formatDateRange(week.from, week.to)} · ${week.total - week.outstanding} dari ${week.total} selesai`
          }
          icon={CalendarCheck}
        />

        <SummaryCard
          title="Habis Buat Bahan"
          prefix="Rp"
          value={Math.round(cost.total).toLocaleString("id-ID")}
          hint="Dari bahan yang kepakai di musim ini"
          icon={Wallet}
        />

        {/* Bagus only, like every headline yield — the Panen page shows the
            same figure, and afkir is said beside it rather than added in. */}
        <SummaryCard
          title="Panen Bagus Sejauh Ini"
          value={harvest.sellableHarvestedKg.toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          count={{ to: harvest.sellableHarvestedKg, decimals: 2 }}
          unit="kg"
          hint={
            harvest.lastHarvestAt
              ? `Terakhir petik ${formatDate(harvest.lastHarvestAt)}` +
                (harvest.harvested.REJECT > 0
                  ? ` · plus ${harvest.harvested.REJECT.toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg afkir`
                  : "")
              : "Belum ada panen tercatat"
          }
          icon={Wheat}
        />
      </div>

      {/* Above everything else: the only mistake here whose consequence
          leaves the garden. */}
      <div className="mt-4 sm:mt-6">
        <HarvestBlockCard blocks={board.harvestBlocks} />
      </div>

      {/* Today first, then the sky: tasks and whether it is a day to spray are
          the morning's two questions, side by side on a desktop and one after
          the other on a phone. */}
      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-2">
        <TodayCard
          dueToday={board.dueToday}
          overdue={board.overdue}
          seasonId={season.id}
          canRecordUsage={actor ? canWrite(actor.role, "usage", actor.access) : false}
          canPostpone={
            actor
              ? canWrite(actor.role, "tasks", actor.access) &&
                !isSeasonClosed(season.status)
              : false
          }
        />

        <WeatherCard
          weather={weather}
          locationName={profile.locationName}
          garden={
            profile.latitude !== null && profile.longitude !== null
              ? { latitude: profile.latitude, longitude: profile.longitude }
              : null
          }
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

        {/* The full width on a desktop: five cards in two columns left this
            one alone beside an empty half. */}
        <Card className="lg:col-span-2">
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
      <PageHeader title="Ringkasan Kebun" />
      <EmptyState
        icon={Sprout}
        title="Belum ada musim tanam"
        description="Ringkasan dihitung per musim, jadi buat musimnya dulu."
      >
        <Button asChild size="sm">
          <Link href="/seasons">Ke Manajemen Musim</Link>
        </Button>
      </EmptyState>
    </>
  );
}
