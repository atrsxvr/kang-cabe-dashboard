import type { Metadata } from "next";
import Link from "next/link";
import { Sprout } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskLogbook } from "@/components/tasks/task-logbook";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskViews } from "@/components/tasks/task-views";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateHst, formatDate } from "@/lib/hst";
import { readSeasonParam } from "@/lib/season-param";
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

  const [tasks, completed, members] = await Promise.all([
    listTasksBySeason(season.id),
    listCompletedTasksBySeason(season.id),
    listActiveMembers(),
  ]);

  const currentHst = calculateHst(season.startDate);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Jadwal & Tugas"
          description={`${season.name} · ditanam ${formatDate(season.startDate)}`}
        />
        <CreateTaskDialog
          seasonId={season.id}
          members={members}
          currentHst={currentHst}
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

      <TaskViews
        logbookCount={completed.length}
        board={
          <TaskBoard
            tasks={tasks}
            seasonId={season.id}
            currentHst={currentHst}
          />
        }
        table={
          <TaskTable
            tasks={tasks}
            seasonId={season.id}
            currentHst={currentHst}
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
