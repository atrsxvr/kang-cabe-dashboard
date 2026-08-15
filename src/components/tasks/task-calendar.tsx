"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateHst, formatDate } from "@/lib/hst";
import { cn } from "@/lib/utils";
import type { TaskRow } from "@/server/queries/tasks";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Jakarta has no daylight saving, so a plain date key is unambiguous. */
function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    date
  );
}

/**
 * Today's year and month **as Jakarta sees them**.
 *
 * `getFullYear()` and `getMonth()` read the browser's own clock, which is a
 * different date from Jakarta's for seven hours a day. On a laptop set to UTC,
 * 1 September at 01:00 WIB is still 31 August locally — the grid would draw
 * August while the highlighted day belonged to September, so no cell would be
 * marked at all. Everything else here is already pinned to Jakarta; this was
 * the one thing that was not.
 */
function jakartaToday(now: Date): { year: number; month: number } {
  const [year, month] = dayKey(now).split("-").map(Number);
  return { year, month: month - 1 };
}

/**
 * A month at a glance, for the question the board cannot answer: is next week
 * empty, or is everything piled onto one Saturday?
 *
 * Read-only on purpose. Editing lives in the board and the table; adding a
 * third place to change a task would be a third path to keep in step.
 */
export function TaskCalendar({
  tasks,
  seasonStart,
}: {
  tasks: TaskRow[];
  seasonStart: Date;
}) {
  const [offset, setOffset] = useState(0);

  const { cells, label } = useMemo(() => {
    const today = new Date();
    const anchor = jakartaToday(today);
    const cursor = new Date(anchor.year, anchor.month + offset, 1);

    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Monday-first: the working week here starts then, and the weekend column
    // is what people scan for.
    const lead = (first.getDay() + 6) % 7;

    const byDay = new Map<string, TaskRow[]>();
    for (const task of tasks) {
      const key = dayKey(task.dueDate);
      byDay.set(key, [...(byDay.get(key) ?? []), task]);
    }

    const todayKey = dayKey(today);

    return {
      label: new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
      }).format(cursor),
      cells: [
        ...Array.from({ length: lead }, () => null),
        ...Array.from({ length: daysInMonth }, (_, index) => {
          const date = new Date(year, month, index + 1);
          const key = dayKey(date);

          return {
            date,
            day: index + 1,
            key,
            isToday: key === todayKey,
            isWeekend: [0, 6].includes(date.getDay()),
            tasks: byDay.get(key) ?? [],
          };
        }),
      ],
    };
  }, [tasks, offset]);

  return (
    <Card className="py-4">
      <CardContent className="grid gap-3 px-3 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOffset((current) => current - 1)}
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <p className="text-sm font-medium capitalize">{label}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOffset((current) => current + 1)}
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <p
              key={day}
              className="text-muted-foreground py-1 text-center text-[11px] font-medium"
            >
              {day}
            </p>
          ))}

          {cells.map((cell, index) =>
            cell === null ? (
              <div key={`pad-${index}`} />
            ) : (
              <div
                key={cell.key}
                className={cn(
                  "min-h-16 rounded-md border p-1 text-left sm:min-h-20",
                  cell.isWeekend && "bg-muted/40",
                  cell.isToday && "border-primary"
                )}
              >
                <p
                  className={cn(
                    "text-[11px] tabular-nums",
                    cell.isToday
                      ? "text-primary font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {cell.day}
                </p>

                <div className="mt-0.5 grid gap-0.5">
                  {cell.tasks.slice(0, 2).map((task) => (
                    <p
                      key={task.id}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[10px] leading-tight",
                        task.status === "DONE"
                          ? "bg-emerald-500/15 text-emerald-800 line-through dark:text-emerald-300"
                          : "bg-primary/10 text-foreground"
                      )}
                      title={task.title}
                    >
                      {task.title}
                    </p>
                  ))}
                  {cell.tasks.length > 2 ? (
                    <p className="text-muted-foreground px-1 text-[10px]">
                      +{cell.tasks.length - 2} lagi
                    </p>
                  ) : null}
                </div>
              </div>
            )
          )}
        </div>

        <UpcomingList tasks={tasks} seasonStart={seasonStart} />
      </CardContent>
    </Card>
  );
}

/**
 * The calendar cells are too small to read on a phone, so the next few jobs
 * are also spelled out underneath. Same data, legible.
 */
function UpcomingList({
  tasks,
  seasonStart,
}: {
  tasks: TaskRow[];
  seasonStart: Date;
}) {
  const upcoming = tasks
    .filter((task) => task.status !== "DONE")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5);

  if (upcoming.length === 0) return null;

  return (
    <div className="grid gap-2 border-t pt-3">
      <p className="text-muted-foreground text-xs font-medium">
        Yang paling dekat
      </p>
      {upcoming.map((task) => (
        <div
          key={task.id}
          className="flex flex-wrap items-center justify-between gap-2 text-sm"
        >
          <span className="min-w-0 truncate">{task.title}</span>
          <span className="text-muted-foreground flex items-center gap-2 text-xs">
            {formatDate(task.dueDate)} · HST{" "}
            {calculateHst(seasonStart, task.dueDate)}
            <StatusBadge status={task.status} kind="task" />
          </span>
        </div>
      ))}
    </div>
  );
}
