import { TaskCard } from "@/components/tasks/task-card";
import type { TaskRow } from "@/server/queries/tasks";
import { taskStatuses } from "@/server/actions/schemas";

const columnLabels: Record<string, string> = {
  TODO: "Belum dikerjakan",
  IN_PROGRESS: "Dikerjakan",
  DONE: "Selesai",
};

export function TaskBoard({
  tasks,
  seasonId,
  currentHst,
}: {
  tasks: TaskRow[];
  seasonId: string;
  currentHst: number;
}) {
  return (
    // Three columns do not fit a phone. Scrolling horizontally keeps the board
    // shape intact; the Tabel view is there for anyone who prefers not to.
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="grid min-w-[46rem] grid-cols-3 gap-4">
        {taskStatuses.map((status) => {
          const column = tasks.filter((task) => task.status === status);

          return (
            <section key={status} aria-label={columnLabels[status]}>
              <header className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium">{columnLabels[status]}</h2>
                <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs tabular-nums">
                  {column.length}
                </span>
              </header>

              <div className="grid content-start gap-3">
                {column.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-6 text-center text-xs">
                    Kosong
                  </p>
                ) : (
                  column.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      seasonId={seasonId}
                      currentHst={currentHst}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
