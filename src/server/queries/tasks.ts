import "server-only";

import { prisma } from "@/lib/prisma";
import type { TaskStatus } from "@/generated/prisma/client";

/**
 * Every read here takes `seasonId` as its first argument, by rule. Tasks are
 * meaningless unscoped, and an unfiltered query would spill one season's work
 * into another's board and logbook.
 */

export type TaskAssigneeView = {
  userId: string;
  name: string;
};

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  hst: number | null;
  dueDate: Date;
  status: TaskStatus;
  completedAt: Date | null;
  assignees: TaskAssigneeView[];
};

const taskSelect = {
  id: true,
  title: true,
  description: true,
  hst: true,
  dueDate: true,
  status: true,
  completedAt: true,
  assignees: {
    select: { user: { select: { id: true, name: true } } },
  },
} as const;

type RawTask = {
  id: string;
  title: string;
  description: string | null;
  hst: number | null;
  dueDate: Date;
  status: TaskStatus;
  completedAt: Date | null;
  assignees: { user: { id: string; name: string } }[];
};

function toRow(task: RawTask): TaskRow {
  return {
    ...task,
    assignees: task.assignees.map(({ user }) => ({
      userId: user.id,
      name: user.name,
    })),
  };
}

export async function listTasksBySeason(seasonId: string): Promise<TaskRow[]> {
  const tasks = await prisma.task.findMany({
    where: { seasonId },
    select: taskSelect,
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  return tasks.map(toRow);
}

/** Completed tasks, newest first — the Logbook Kebun. */
export async function listCompletedTasksBySeason(
  seasonId: string
): Promise<TaskRow[]> {
  const tasks = await prisma.task.findMany({
    where: { seasonId, status: "DONE", completedAt: { not: null } },
    select: taskSelect,
    orderBy: { completedAt: "desc" },
  });

  return tasks.map(toRow);
}

export async function countTasksByStatus(
  seasonId: string
): Promise<Record<TaskStatus, number>> {
  const grouped = await prisma.task.groupBy({
    by: ["status"],
    where: { seasonId },
    _count: { _all: true },
  });

  const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 } as Record<
    TaskStatus,
    number
  >;

  for (const row of grouped) counts[row.status] = row._count._all;
  return counts;
}
