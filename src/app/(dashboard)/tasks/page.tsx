import type { Metadata } from "next";
import Link from "next/link";
import { PackageMinus, Sprout } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskLogbook } from "@/components/tasks/task-logbook";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskViews } from "@/components/tasks/task-views";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateHst, formatDate } from "@/lib/hst";
import { readSeasonParam } from "@/lib/season-param";
import { listStock } from "@/server/queries/inventory";
import { listRecipes } from "@/server/queries/recipes";
import { resolveSeason } from "@/server/queries/seasons";
import {
  listCompletedTasksBySeason,
  listTasksBySeason,
} from "@/server/queries/tasks";
import { listActiveMembers } from "@/server/queries/users";

export const metadata: Metadata = { title: "Jadwal & Tugas" };

export default async function TasksPage(props: PageProps<"/tasks">) {
  const searchParams = await props.searchParams;

  // No connection() needed: reading searchParams already opts this page out of
  // prerendering.
  const season = await resolveSeason(readSeasonParam(searchParams));

  if (!season) return <NoSeason />;

  const [tasks, completed, members, recipes, materials] = await Promise.all([
    listTasksBySeason(season.id),
    listCompletedTasksBySeason(season.id),
    listActiveMembers(),
    listRecipes(),
    listStock(),
  ]);

  const currentHst = calculateHst(season.startDate);

  // Recording usage is deliberately manual, so it needs somewhere to be
  // noticed — a card that only gets a footnote is a card nobody clicks.
  const unrecorded = tasks.filter(
    (task) =>
      task.status === "DONE" &&
      task.materials.length > 0 &&
      !task.usageRecordedAt
  ).length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Jadwal & Tugas"
          description={`${season.name} · ditanam ${formatDate(season.startDate)}`}
        />
        <TaskDialog
          seasonId={season.id}
          members={members}
          currentHst={currentHst}
          recipes={recipes}
          materials={materials}
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="bg-muted/50 flex items-baseline gap-2 rounded-lg border px-3 py-2">
          <span className="text-muted-foreground text-xs">Umur tanaman</span>
          <span className="text-lg font-semibold tabular-nums">
            HST {currentHst}
          </span>
        </div>
        <StatusBadge status={season.status} kind="season" />
        <span className="text-muted-foreground text-sm tabular-nums">
          {tasks.length} tugas
        </span>
      </div>

      {unrecorded > 0 ? (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <PackageMinus className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            {unrecorded} tugas selesai memakai bahan racikan tapi stoknya belum
            dikurangi. Buka tugasnya lalu tekan{" "}
            <span className="font-medium">Catat pemakaian</span>.
          </p>
        </div>
      ) : null}

      <TaskViews
        logbookCount={completed.length}
        board={
          <TaskBoard
            tasks={tasks}
            seasonId={season.id}
            currentHst={currentHst}
            members={members}
            recipes={recipes}
            materials={materials}
          />
        }
        table={
          <TaskTable
            tasks={tasks}
            seasonId={season.id}
            currentHst={currentHst}
            members={members}
            recipes={recipes}
            materials={materials}
          />
        }
        logbook={
          <TaskLogbook tasks={completed} seasonStart={season.startDate} />
        }
      />
    </>
  );
}

function NoSeason() {
  return (
    <>
      <PageHeader title="Jadwal & Tugas" />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="bg-muted rounded-lg p-3">
            <Sprout className="text-muted-foreground size-6" aria-hidden />
          </div>
          <div>
            <p className="font-medium">Belum ada musim tanam</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Tugas selalu melekat pada satu musim, jadi buat musimnya dulu.
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
