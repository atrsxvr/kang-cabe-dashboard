import { CalendarDays, Users } from "lucide-react";

import { StatusBadge } from "@/components/common/status-badge";
import { TaskStatusButtons } from "@/components/tasks/task-status-buttons";
import { Card, CardContent } from "@/components/ui/card";
import { daysUntil, formatDate } from "@/lib/hst";
import { cn } from "@/lib/utils";
import type { TaskRow } from "@/server/queries/tasks";

export function TaskCard({
  task,
  seasonId,
  currentHst,
  showStatus = false,
}: {
  task: TaskRow;
  seasonId: string;
  /** Season age today, used to judge whether a planned HST has passed. */
  currentHst: number;
  showStatus?: boolean;
}) {
  const remaining = daysUntil(task.dueDate);
  const overdue = task.status !== "DONE" && remaining < 0;
  const hstPassed =
    task.status !== "DONE" && task.hst !== null && currentHst > task.hst;

  return (
    <Card className="gap-0 py-3">
      <CardContent className="grid gap-2 px-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm leading-snug font-medium">{task.title}</p>
          {showStatus ? (
            <StatusBadge status={task.status} kind="task" className="shrink-0" />
          ) : null}
        </div>

        {task.description ? (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {task.description}
          </p>
        ) : null}

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1",
              overdue && "text-destructive font-medium"
            )}
          >
            <CalendarDays className="size-3.5" aria-hidden />
            {formatDate(task.dueDate)}
            {overdue ? ` · telat ${Math.abs(remaining)} hari` : null}
          </span>

          {task.hst !== null ? (
            <span className={cn(hstPassed && "text-amber-600 font-medium")}>
              HST {task.hst}
              {hstPassed ? ` · lewat ${currentHst - task.hst} hari` : null}
            </span>
          ) : null}
        </div>

        {task.assignees.length > 0 ? (
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <Users className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {task.assignees.map((a) => a.name).join(", ")}
            </span>
          </p>
        ) : null}

        <TaskStatusButtons
          taskId={task.id}
          seasonId={seasonId}
          status={task.status}
        />
      </CardContent>
    </Card>
  );
}
