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
import { countWeekendTasks } from "@/server/queries/dashboard";
import { seasonMaterialCost } from "@/server/queries/finance";
import { resolveSeason } from "@/server/queries/seasons";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;

  // Reading searchParams already opts this page out of prerendering, so the
  // figures below are computed per request rather than frozen at build time.
  const season = await resolveSeason(readSeasonParam(searchParams));

  if (!season) return <NoSeason />;

  const [weekend, cost] = await Promise.all([
    countWeekendTasks(season.id),
    seasonMaterialCost(season.id),
  ]);
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          value="128,5"
          unit="kg"
          hint="Contoh — modul Panen belum dibangun"
          icon={Wheat}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Status Data</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            <strong className="text-foreground">Umur Tanaman</strong> dan{" "}
            <strong className="text-foreground">Tugas Weekend Ini</strong>{" "}
            dihitung dari database untuk musim yang dipilih di navbar.
          </p>
          <p>
            Dua kartu lainnya masih berisi angka contoh karena modul Keuangan
            dan Panen belum dibangun.
          </p>
          <Button asChild size="sm" variant="secondary" className="mt-2">
            <Link href={withSeason("/tasks", season.id)}>Lihat semua tugas</Link>
          </Button>
        </CardContent>
      </Card>
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
