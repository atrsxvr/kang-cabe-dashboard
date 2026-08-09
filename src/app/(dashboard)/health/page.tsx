import type { Metadata } from "next";
import Link from "next/link";
import { Leaf, Sprout } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { FindingCard } from "@/components/health/finding-card";
import { FindingStatusBoxes } from "@/components/health/finding-status-boxes";
import { FindingStatusSelect } from "@/components/health/finding-status-select";
import { ReportFindingDialog } from "@/components/health/report-finding-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateHst, formatDate } from "@/lib/hst";
import { readStatusParam } from "@/lib/finding-filter";
import { readSeasonParam } from "@/lib/season-param";
import {
  countFindingsByStatus,
  listFindingsBySeason,
} from "@/server/queries/findings";
import { resolveSeason } from "@/server/queries/seasons";
import { listTreatmentRecipes } from "@/server/queries/recipes";
import { listActiveMembers } from "@/server/queries/users";
import { isPhotoUploadEnabled } from "@/server/storage";

export const metadata: Metadata = { title: "Kesehatan & Monitoring" };

export default async function HealthPage(props: PageProps<"/health">) {
  const searchParams = await props.searchParams;
  const season = await resolveSeason(readSeasonParam(searchParams));

  if (!season) return <NoSeason />;

  const activeStatus = readStatusParam(searchParams);

  const [findings, counts, members, treatmentRecipes] = await Promise.all([
    listFindingsBySeason(season.id, activeStatus),
    // Counts stay unfiltered — they are the filter control, so they have to
    // keep showing what each stage holds even while one is selected.
    countFindingsByStatus(season.id),
    listActiveMembers(),
    listTreatmentRecipes(),
  ]);

  const currentHst = calculateHst(season.startDate);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Kesehatan & Monitoring"
          description={`${season.name} · HST ${currentHst} · ditanam ${formatDate(season.startDate)}`}
        />
        {/* Filter sits with the page actions rather than on its own row —
            on a phone every extra row pushes the findings further down. */}
        <div className="flex flex-wrap items-center gap-2">
          <FindingStatusSelect active={activeStatus} />
          <ReportFindingDialog
            seasonId={season.id}
            members={members}
            currentHst={currentHst}
            photoEnabled={isPhotoUploadEnabled()}
          />
        </div>
      </div>

      <FindingStatusBoxes counts={counts} active={activeStatus} />

      {findings.length === 0 ? (
        <EmptyFindings filtered={Boolean(activeStatus)} />
      ) : (
        <div className="grid gap-4">
          {findings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              seasonId={season.id}
              members={members}
              treatmentRecipes={treatmentRecipes}
            />
          ))}
        </div>
      )}
    </>
  );
}

function EmptyFindings({ filtered }: { filtered: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="bg-muted rounded-lg p-3">
          <Leaf className="text-muted-foreground size-6" aria-hidden />
        </div>
        <div>
          <p className="font-medium">
            {filtered ? "Tidak ada temuan di tahap ini" : "Belum ada temuan"}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {filtered
              ? "Pilih tahap lain, atau tampilkan semua temuan."
              : "Catat apa pun yang terlihat tidak beres saat keliling kebun — Agronomis akan menindaklanjuti."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function NoSeason() {
  return (
    <>
      <PageHeader title="Kesehatan & Monitoring" />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="bg-muted rounded-lg p-3">
            <Sprout className="text-muted-foreground size-6" aria-hidden />
          </div>
          <div>
            <p className="font-medium">Belum ada musim tanam</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Temuan selalu melekat pada satu musim, jadi buat musimnya dulu.
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
