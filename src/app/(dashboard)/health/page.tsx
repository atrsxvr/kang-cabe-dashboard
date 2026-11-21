import type { Metadata } from "next";
import Link from "next/link";
import { Leaf, Sprout } from "lucide-react";

import { CanWrite } from "@/components/auth/can-write";
import { PageHeader } from "@/components/common/page-header";
import { FindingCard } from "@/components/health/finding-card";
import { FindingStatusBoxes } from "@/components/health/finding-status-boxes";
import { FindingStatusSelect } from "@/components/health/finding-status-select";
import { FindingDialog } from "@/components/health/finding-dialog";
import { Button } from "@/components/ui/button";
import { calculateHst, formatDate } from "@/lib/hst";
import { readStatusParam } from "@/lib/finding-filter";
import { readSeasonParam } from "@/lib/season-param";
import {
  countFindingsByStatus,
  listFindingsBySeason,
} from "@/server/queries/findings";
import { resolveSeason } from "@/server/queries/seasons";
import { listStock } from "@/server/queries/inventory";
import { listRecipes, listTreatmentRecipes } from "@/server/queries/recipes";
import { listActiveMembers } from "@/server/queries/users";
import { canWrite } from "@/lib/permissions";
import { currentActor } from "@/server/auth/guard";
import { isPhotoUploadEnabled } from "@/server/storage";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Kesehatan & Monitoring" };

export default async function HealthPage(props: PageProps<"/health">) {
  const searchParams = await props.searchParams;
  const season = await resolveSeason(readSeasonParam(searchParams));

  if (!season) return <NoSeason />;

  const activeStatus = readStatusParam(searchParams);

  const [findings, counts, members, treatmentRecipes, actor, recipes, materials] = await Promise.all([
    listFindingsBySeason(season.id, activeStatus),
    // Counts stay unfiltered — they are the filter control, so they have to
    // keep showing what each stage holds even while one is selected.
    countFindingsByStatus(season.id),
    listActiveMembers(),
    listTreatmentRecipes(),
    currentActor(),
    // For "Jadwalkan penanganan": the task form picks from every recipe and
    // the whole shed, as it does on the tasks page.
    listRecipes(),
    listStock(),
  ]);

  const scheduling =
    actor && canWrite(actor.role, "tasks", actor.access)
      ? { recipes, materials }
      : undefined;

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
          <CanWrite area="findings">
            <FindingDialog
              seasonId={season.id}
              members={members}
              currentHst={currentHst}
              photoEnabled={isPhotoUploadEnabled()}
              canChooseReporter={
                actor ? canWrite(actor.role, "diagnosis", actor.access) : false
              }
            />
          </CanWrite>
        </div>
      </div>

      <FindingStatusBoxes counts={counts} active={activeStatus} />

      {findings.length === 0 ? (
        <EmptyFindings filtered={Boolean(activeStatus)} />
      ) : (
        <div className="grid gap-4" data-fresh-scope={activeStatus ?? ""}>
          {findings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              seasonId={season.id}
              members={members}
              treatmentRecipes={treatmentRecipes}
              currentHst={currentHst}
              photoEnabled={isPhotoUploadEnabled()}
              actor={actor}
              scheduling={scheduling}
            />
          ))}
        </div>
      )}
    </>
  );
}

function EmptyFindings({ filtered }: { filtered: boolean }) {
  return (
    <EmptyState
      icon={Leaf}
      title={filtered ? "Tidak ada temuan di tahap ini" : "Belum ada temuan"}
      description={
        filtered
          ? "Pilih tahap lain, atau tampilkan semua temuan."
          : "Catat apa pun yang terlihat tidak beres saat keliling kebun — Agronomis akan menindaklanjuti."
      }
    />
  );
}

function NoSeason() {
  return (
    <>
      <PageHeader title="Kesehatan & Monitoring" />
      <EmptyState
        icon={Sprout}
        title="Belum ada musim tanam"
        description="Temuan selalu melekat pada satu musim, jadi buat musimnya dulu."
      >
        <Button asChild size="sm">
          <Link href="/seasons">Ke Manajemen Musim</Link>
        </Button>
      </EmptyState>
    </>
  );
}
