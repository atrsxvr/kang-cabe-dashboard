import { CheckCircle2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { calculateHst, formatDateTime } from "@/lib/hst";
import type { TaskRow } from "@/server/queries/tasks";

/**
 * Jurnal Kebun — completed work in reverse chronological order, by
 * `completedAt` rather than `updatedAt` so editing an old entry does not
 * reshuffle history.
 */
export function TaskLogbook({
  tasks,
  seasonStart,
}: {
  tasks: TaskRow[];
  seasonStart: Date;
}) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          Belum ada tugas yang selesai di musim ini.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-2">
        <ol className="divide-y">
          {tasks.map((task) => {
            // HST at the moment it was completed, not today — that is what
            // makes the journal useful when comparing seasons later.
            const hstAtCompletion = task.completedAt
              ? calculateHst(seasonStart, task.completedAt)
              : null;

            return (
              <li key={task.id} className="flex items-start gap-3 py-3">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-500"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{task.title}</p>
                  {task.description ? (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                      {task.description}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground mt-1 text-xs">
                    {task.completedAt ? formatDateTime(task.completedAt) : "—"}
                    {hstAtCompletion !== null
                      ? ` · HST ${hstAtCompletion}`
                      : null}
                    {task.assignees.length > 0
                      ? ` · ${task.assignees.map((a) => a.name).join(", ")}`
                      : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
