import { CalendarDays, Users } from "lucide-react";

import { ConfirmDelete } from "@/components/common/confirm-delete";
import { StatusBadge } from "@/components/common/status-badge";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskLaborPaid } from "@/components/tasks/task-labor-paid";
import { TaskStatusButtons } from "@/components/tasks/task-status-buttons";
import { TaskUsageAction } from "@/components/tasks/task-usage-action";
import { Card, CardContent } from "@/components/ui/card";
import { daysUntil, formatDate } from "@/lib/hst";
import { cn } from "@/lib/utils";
import { deleteTask } from "@/server/actions/tasks";
import { deleteConsequence } from "@/components/tasks/delete-consequence";
import { TaskPostpone } from "@/components/tasks/task-postpone";
import type { TaskRow } from "@/server/queries/tasks";
import type { StockRow } from "@/server/queries/inventory";
import type { RecipeRow } from "@/server/queries/recipes";
import type { MemberOption } from "@/server/queries/users";

export function TaskCard({
  task,
  seasonId,
  currentHst,
  members,
  recipes,
  materials,
  showStatus = false,
  canWriteTasks,
  canDeleteTasks,
  canRecordUsage,
}: {
  task: TaskRow;
  seasonId: string;
  /** Season age today, used to judge whether a planned HST has passed. */
  currentHst: number;
  members: MemberOption[];
  recipes: RecipeRow[];
  materials: StockRow[];
  showStatus?: boolean;
  /** Boleh menyunting, menghapus, dan menggeser status tugas. */
  canWriteTasks: boolean;
  /** Admin, and the season is not yet Selesai. */
  canDeleteTasks: boolean;
  /**
   * Boleh menekan "Catat pemakaian". Izin yang berbeda, dan sengaja.
   *
   * Tombolnya duduk di kartu tugas, tapi yang dikerjakannya memotong stok
   * gudang — pekerjaan Logistik. Menggabungkannya dengan izin menyunting tugas
   * berarti Logistik tidak bisa memotong stok untuk tugas yang sudah selesai.
   */
  canRecordUsage: boolean;
}) {
  const remaining = daysUntil(task.dueDate);
  const overdue = task.status !== "DONE" && remaining < 0;
  // Due today or late: when "can it still happen today?" gets asked.
  const postponable = task.status !== "DONE" && remaining <= 0;

  return (
    <Card className="gap-0 py-3">
      <CardContent className="grid gap-2 px-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm leading-snug font-medium">{task.title}</p>
          {showStatus ? (
            <StatusBadge
              status={task.status}
              kind="task"
              className="shrink-0"
            />
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
              overdue && "text-destructive font-medium",
            )}
          >
            <CalendarDays className="size-3.5" aria-hidden />
            {formatDate(task.dueDate)}
            {overdue ? ` · telat ${Math.abs(remaining)} hari` : null}
          </span>

          {/* The HST is the date counted from planting, so lateness is
              already said once, beside the date. */}
          {task.hst !== null ? <span>HST {task.hst}</span> : null}
        </div>

        {task.assignees.length > 0 ? (
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <Users className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {task.assignees.map((a) => a.name).join(", ")}
            </span>
          </p>
        ) : null}

        <TaskLaborPaid task={task} />

        {task.materials.length > 0 && canRecordUsage ? (
          <div className="flex flex-wrap items-center gap-2 border-t pt-2">
            <TaskUsageAction
              task={task}
              seasonId={seasonId}
              members={members}
            />
          </div>
        ) : null}

        {canWriteTasks ? (
        <div className="flex items-center gap-1 border-t pt-2">
          <TaskDialog
            seasonId={seasonId}
            members={members}
            recipes={recipes}
            materials={materials}
            currentHst={currentHst}
            task={task}
          />
          {canDeleteTasks && postponable ? (
            <TaskPostpone
              taskId={task.id}
              seasonId={seasonId}
              title={task.title}
              dueDate={task.dueDate}
            />
          ) : null}
          {canDeleteTasks ? (
            <ConfirmDelete
              title="Hapus tugas ini?"
              itemName={task.title}
              consequence={deleteConsequence(task)}
              action={deleteTask}
              fields={{ taskId: task.id, seasonId }}
              iconOnly
            />
          ) : null}
          <div className="ml-auto">
            <TaskStatusButtons
              taskId={task.id}
              seasonId={seasonId}
              status={task.status}
              variant="card"
              usagePending={
                canRecordUsage &&
                task.materials.length > 0 &&
                !task.usageRecordedAt
              }
            />
          </div>
        </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
