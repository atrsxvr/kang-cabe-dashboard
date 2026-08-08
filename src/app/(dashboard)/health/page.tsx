import type { Metadata } from "next";
import Link from "next/link";
import { Leaf, Sprout } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { FindingCard } from "@/components/health/finding-card";
import { findingStatusLabels } from "@/components/health/finding-labels";
import { ReportFindingDialog } from "@/components/health/report-finding-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateHst, formatDate } from "@/lib/hst";
import { readSeasonParam } from "@/lib/season-param";
import {
  countFindingsByStatus,
  listFindingsBySeason,
} from "@/server/queries/findings";
import { resolveSeason } from "@/server/queries/seasons";
import { listActiveMembers } from "@/server/queries/users";
import { isPhotoUploadEnabled } from "@/server/storage";

export const metadata: Metadata = { title: "Kesehatan & Monitoring" };

export default async function HealthPage(props: PageProps<"/health">) {
  const searchParams = await props.searchParams;
  const season = await resolveSeason(readSeasonParam(searchParams));

  if (!season) return <NoSeason />;

  const [findings, counts, members] = await Promise.all([
    listFindingsBySeason(season.id),
    countFindingsByStatus(season.id),
    listActiveMembers(),
  ]);

  const currentHst = calculateHst(season.startDate);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Kesehatan & Monitoring"
          description={`${season.name} · HST ${currentHst} · ditanam ${formatDate(season.startDate)}`}
        />
        <ReportFindingDialog
          seasonId={season.id}
          members={members}
          currentHst={currentHst}
          photoEnabled={isPhotoUploadEnabled()}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["REPORTED", "DIAGNOSED", "TREATED", "RESOLVED"] as const).map(
          (status) => (
            <div key={status} className="rounded-lg border px-3 py-2">
              <p className="text-lg font-semibold tabular-nums">
                {counts[status]}
              </p>
              <p className="text-muted-foreground text-xs">
                {findingStatusLabels[status]}
              </p>
            </div>
          )
        )}
      </div>

      {findings.length === 0 ? (
        <EmptyFindings />
      ) : (
        <div className="grid gap-4">
          {findings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              seasonId={season.id}
              members={members}
            />
          ))}
        </div>
      )}
    </>
  );
}

function EmptyFindings() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="bg-muted rounded-lg p-3">
          <Leaf className="text-muted-foreground size-6" aria-hidden />
        </div>
        <div>
          <p className="font-medium">Belum ada temuan</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Catat apa pun yang terlihat tidak beres saat keliling kebun —
            Agronomis akan menindaklanjuti.
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
