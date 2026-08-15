import type { Metadata } from "next";
import Link from "next/link";
import { Skull, Sprout } from "lucide-react";

import { ConfirmDelete } from "@/components/common/confirm-delete";
import { PageHeader } from "@/components/common/page-header";
import { HealthTabs } from "@/components/health/health-tabs";
import { PlantEventDialog } from "@/components/health/plant-event-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPercent, formatPerPlant } from "@/lib/harvest";
import { calculateHst, formatDate } from "@/lib/hst";
import { readSeasonParam } from "@/lib/season-param";
import { cn } from "@/lib/utils";
import { deletePlantEvent } from "@/server/actions/population";
import { listFindingsBySeason } from "@/server/queries/findings";
import { harvestSummary, listPlantEvents } from "@/server/queries/harvest";
import { resolveSeason } from "@/server/queries/seasons";
import { listActiveMembers } from "@/server/queries/users";

export const metadata: Metadata = { title: "Populasi Tanaman" };

export default async function PopulationPage(
  props: PageProps<"/health/populasi">
) {
  const searchParams = await props.searchParams;

  // Reading searchParams already opts this page out of prerendering.
  const season = await resolveSeason(readSeasonParam(searchParams));

  if (!season) return <NoSeason />;

  const [events, summary, members, findings] = await Promise.all([
    listPlantEvents(season.id),
    harvestSummary(season.id),
    listActiveMembers(),
    listFindingsBySeason(season.id),
  ]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Kesehatan & Monitoring"
          description={`${season.name} · berapa pokok yang masih berdiri`}
        />
        <PlantEventDialog
          seasonId={season.id}
          members={members}
          findings={findings}
        />
      </div>

      <HealthTabs />

      <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Tile
          value={summary.actualPlantCount.toLocaleString("id-ID")}
          label="Populasi sekarang"
          hint={`dari ${summary.plantedCount.toLocaleString("id-ID")} ditanam`}
        />
        <Tile
          value={formatPercent(summary.mortalityRate, 1)}
          label="Mortalitas"
          hint={`${summary.diedCount} mati · ${summary.replantedCount} disulam`}
          warn={(summary.mortalityRate ?? 0) > 0.1}
        />
        <Tile
          value={formatPerPlant(
            summary.sellableHarvestedKg,
            summary.actualPlantCount
          )}
          label="Hasil layak per pohon"
          hint={`dari ${formatPerPlant(summary.totalHarvestedKg, summary.actualPlantCount)} total`}
        />
        <Tile
          value={formatPercent(summary.gradeOutRate)}
          label="Lolos sortir"
          hint="porsi panen yang layak jual"
        />
      </div>

      {/* The point of the ratio beside it, said once rather than left to be
          inferred from two numbers. */}
      <p className="text-muted-foreground mb-6 text-xs">
        Hasil per pohon dan lolos sortir dibaca bersama. Kalau hasil turun tapi
        lolos sortir tetap, pohonnya yang kurang berbuah — urusan nutrisi dan
        air. Kalau hasil tetap tapi lolos sortir turun, buahnya banyak yang
        gagal sortir — biasanya penyakit buah atau kelewat matang waktu dipetik.
      </p>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="bg-muted rounded-lg p-3">
              <Sprout className="text-muted-foreground size-6" aria-hidden />
            </div>
            <div>
              <p className="font-medium">Belum ada catatan</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Catat pokok yang mati biar populasinya nggak cuma tebakan. Yang
                mati setelah tanaman besar nggak akan disulam lagi — lubangnya
                tetap kosong sampai musim habis.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {events.map((event) => {
            const dying = event.type === "DIED";

            return (
              <Card key={event.id} className="py-3">
                <CardContent className="flex flex-wrap items-center gap-3 px-4">
                  <div
                    className={cn(
                      "rounded-lg p-2",
                      dying
                        ? "bg-rose-500/12 text-rose-700 dark:text-rose-400"
                        : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                    )}
                  >
                    {dying ? (
                      <Skull className="size-4" aria-hidden />
                    ) : (
                      <Sprout className="size-4" aria-hidden />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {dying ? "Mati" : "Sulam"} {event.count} pokok
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDate(event.eventDate)} · HST{" "}
                      {calculateHst(season.startDate, event.eventDate)}
                      {event.recordedBy ? ` · ${event.recordedBy.name}` : null}
                    </p>
                    {event.cause ? (
                      <p className="text-xs">{event.cause}</p>
                    ) : null}
                    {event.finding ? (
                      <Badge variant="secondary" className="mt-1">
                        dari temuan: {event.finding.symptoms.slice(0, 40)}
                      </Badge>
                    ) : null}
                    {event.note ? (
                      <p className="text-muted-foreground text-xs">
                        {event.note}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                    <PlantEventDialog
                      seasonId={season.id}
                      members={members}
                      findings={findings}
                      event={event}
                    />
                    <ConfirmDelete
                      title="Hapus catatan ini?"
                      itemName={`${dying ? "Mati" : "Sulam"} ${event.count} pokok`}
                      consequence="Populasi sekarang ikut berubah."
                      action={deletePlantEvent}
                      fields={{ eventId: event.id, seasonId: season.id }}
                      iconOnly
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
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
      <PageHeader title="Kesehatan & Monitoring" />
      <HealthTabs />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="bg-muted rounded-lg p-3">
            <Sprout className="text-muted-foreground size-6" aria-hidden />
          </div>
          <div>
            <p className="font-medium">Belum ada musim tanam</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Populasi selalu melekat pada satu musim, jadi buat musimnya dulu.
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
