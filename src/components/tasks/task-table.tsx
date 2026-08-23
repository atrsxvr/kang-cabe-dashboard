import { ConfirmDelete } from "@/components/common/confirm-delete";
import { StatusBadge } from "@/components/common/status-badge";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskStatusButtons } from "@/components/tasks/task-status-buttons";
import { TaskUsageAction } from "@/components/tasks/task-usage-action";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { daysUntil, formatDate } from "@/lib/hst";
import { cn } from "@/lib/utils";
import { deleteTask } from "@/server/actions/tasks";
import type { TaskRow } from "@/server/queries/tasks";
import type { StockRow } from "@/server/queries/inventory";
import type { RecipeRow } from "@/server/queries/recipes";
import type { MemberOption } from "@/server/queries/users";

export function TaskTable({
  tasks,
  seasonId,
  currentHst,
  members,
  recipes,
  materials,
  canWriteTasks,
  canRecordUsage,
}: {
  tasks: TaskRow[];
  seasonId: string;
  currentHst: number;
  members: MemberOption[];
  recipes: RecipeRow[];
  materials: StockRow[];
  /** Boleh menyunting, menghapus, dan menggeser status tugas. */
  canWriteTasks: boolean;
  /** Boleh menekan "Catat pemakaian" — izin gudang, bukan izin tugas. */
  canRecordUsage: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <Card className="text-muted-foreground py-12 text-center text-sm">
        Belum ada tugas di musim ini.
      </Card>
    );
  }

  return (
    <>
      {/* A seven-column table is unreadable on a phone even with scrolling, so
          below `md` the same data is shown as cards. */}
      <div className="grid gap-3 md:hidden">
        {tasks.map((task) => (
          <TaskCard
              canWriteTasks={canWriteTasks}
              canRecordUsage={canRecordUsage}
            key={task.id}
            task={task}
            seasonId={seasonId}
            currentHst={currentHst}
            members={members}
            recipes={recipes}
            materials={materials}
            showStatus
          />
        ))}
      </div>

      <Card className="hidden overflow-hidden py-0 md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-56">Tugas</TableHead>
                <TableHead className="text-right">HST</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Penugas</TableHead>
                {/* Pinned: their content changes with status, and an auto-sized
                    column would re-measure and shift the row on every update. */}
                <TableHead className="w-40">Status</TableHead>
                {canWriteTasks ? (
                  <TableHead className="w-64">Aksi</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const remaining = daysUntil(task.dueDate);
                const overdue = task.status !== "DONE" && remaining < 0;

                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      {task.title}
                      {task.description ? (
                        <span className="text-muted-foreground line-clamp-1 block text-xs font-normal">
                          {task.description}
                        </span>
                      ) : null}
                      {/* Sits with the task rather than in Aksi: that column
                          is pinned to a fixed width so the row never
                          re-measures on a status change. */}
                      {task.materials.length > 0 && canRecordUsage ? (
                        <div className="mt-1 font-normal">
                          <TaskUsageAction
                            task={task}
                            seasonId={seasonId}
                            members={members}
                          />
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {task.hst ?? "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "whitespace-nowrap",
                        overdue && "text-destructive font-medium",
                      )}
                    >
                      {formatDate(task.dueDate)}
                      {overdue ? (
                        <span className="block text-xs">
                          telat {Math.abs(remaining)} hari
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {task.assignees.length > 0
                        ? task.assignees.map((a) => a.name).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="w-40">
                      <StatusBadge status={task.status} kind="task" block />
                    </TableCell>
                    {canWriteTasks ? (
                    <TableCell className="w-64">
                      <div className="flex items-center gap-1">
                        <TaskStatusButtons
                          taskId={task.id}
                          seasonId={seasonId}
                          status={task.status}
                        />
                        <TaskDialog
                          seasonId={seasonId}
                          members={members}
                          recipes={recipes}
                          materials={materials}
                          currentHst={currentHst}
                          task={task}
                        />
                        <ConfirmDelete
                          title="Hapus tugas ini?"
                          itemName={task.title}
                          action={deleteTask}
                          fields={{ taskId: task.id, seasonId }}
                          iconOnly
                        />
                      </div>
                    </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  );
}
