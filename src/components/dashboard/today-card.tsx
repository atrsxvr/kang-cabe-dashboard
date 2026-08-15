import Link from "next/link";
import { CalendarCheck, CheckCircle2 } from "lucide-react";

import { StatusBadge } from "@/components/common/status-badge";
import { TaskStatusButtons } from "@/components/tasks/task-status-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/hst";
import { withSeason } from "@/lib/season-param";
import { cn } from "@/lib/utils";
import type { DueTask } from "@/server/queries/dashboard";

/**
 * What still has to happen, closable from here.
 *
 * The board is two taps away and this is the page people land on, so the one
 * thing worth doing from the dashboard — marking a job done — is possible
 * without leaving it.
 */
export function TodayCard({
  dueToday,
  overdue,
  seasonId,
}: {
  dueToday: DueTask[];
  overdue: DueTask[];
  seasonId: string;
}) {
  const rows = [...overdue, ...dueToday];

  return (
    <Card>
      <CardContent className="grid gap-3 py-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarCheck
              className="text-muted-foreground size-4"
              aria-hidden
            />
            <h2 className="text-sm font-medium">Dikerjakan hari ini</h2>
          </div>
          {overdue.length > 0 ? (
            <span className="text-destructive text-xs tabular-nums">
              {overdue.length} telat
            </span>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <p className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            Nggak ada yang jatuh tempo hari ini. Aman.
          </p>
        ) : (
          <ul className="grid gap-2">
            {rows.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{task.title}</p>
                  <p
                    className={cn(
                      "text-xs",
                      task.daysLeft < 0
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {task.daysLeft < 0
                      ? `Telat ${Math.abs(task.daysLeft)} hari · ${formatDate(task.dueDate)}`
                      : "Jatuh tempo hari ini"}
                    {task.assignees.length > 0
                      ? ` · ${task.assignees.join(", ")}`
                      : null}
                  </p>
                </div>

                <StatusBadge status={task.status} kind="task" />

                <TaskStatusButtons
                  taskId={task.id}
                  seasonId={seasonId}
                  status={task.status}
                  variant="card"
                />
              </li>
            ))}
          </ul>
        )}

        <Button
          asChild
          size="sm"
          variant="secondary"
          className="justify-self-start"
        >
          <Link href={withSeason("/tasks", seasonId)}>Lihat semua tugas</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
