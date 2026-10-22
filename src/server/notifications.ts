import "server-only";

import { severityLabels } from "@/components/health/finding-labels";
import {
  newFindingMessage,
  scheduledSoon,
  scheduledTaskMessage,
  tomorrowTasksMessage,
  tomorrowWindow,
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { sendPush, type PushResult } from "@/server/push";

/**
 * The two notifications the owner asked for, and who receives them.
 */

async function activeMemberIds(except: string[] = []): Promise<string[]> {
  const members = await prisma.user.findMany({
    where: { deletedAt: null, id: { notIn: except } },
    select: { id: true },
  });
  return members.map((member) => member.id);
}

/**
 * A new finding, to every active member except whoever typed it in and whoever
 * it was reported by — an Admin may record one on another member's behalf,
 * and both of them already know.
 */
export async function notifyNewFinding(
  findingId: string,
  recordedById: string
): Promise<PushResult | null> {
  const finding = await prisma.healthLog.findUnique({
    where: { id: findingId },
    select: {
      id: true,
      seasonId: true,
      symptoms: true,
      severity: true,
      location: true,
      reportedById: true,
      reportedBy: { select: { name: true } },
    },
  });
  if (!finding) return null;

  const knew = [recordedById, finding.reportedById].filter(
    (id): id is string => Boolean(id)
  );

  return sendPush(
    await activeMemberIds(knew),
    newFindingMessage({
      id: finding.id,
      seasonId: finding.seasonId,
      reporter: finding.reportedBy?.name ?? "anggota",
      symptoms: finding.symptoms,
      severity: severityLabels[finding.severity] ?? finding.severity,
      location: finding.location,
    })
  );
}

export type TomorrowResult = { tasks: number } & Partial<PushResult>;

/**
 * Tomorrow's unfinished tasks, to every active member, the evening before.
 * Seasons that are closed or archived are left out: their tasks are history.
 * Nothing is sent on a day with nothing to do.
 */
export async function notifyTomorrowTasks(now: Date): Promise<TomorrowResult> {
  const { from, to } = tomorrowWindow(now);

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: from, lt: to },
      status: { not: "DONE" },
      season: { status: { in: ["PLANNING", "ACTIVE", "HARVESTING"] } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    select: { title: true, season: { select: { name: true } } },
  });

  const message = tomorrowTasksMessage(
    tasks.map((task) => ({ title: task.title, season: task.season.name }))
  );
  if (!message) return { tasks: 0 };

  return { tasks: tasks.length, ...(await sendPush(await activeMemberIds(), message)) };
}

/**
 * A task scheduled for today, or for tomorrow after the evening summary has
 * gone — the cases the summary cannot cover (`scheduledSoon`). To every
 * active member, whoever saved it: it is a reminder to do the work, not news
 * about who typed it.
 */
export async function notifyScheduledTask(
  taskId: string,
  now: Date
): Promise<PushResult | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      season: { select: { name: true, status: true } },
    },
  });
  if (!task || task.status === "DONE") return null;
  if (!["PLANNING", "ACTIVE", "HARVESTING"].includes(task.season.status)) return null;

  const when = scheduledSoon(task.dueDate, now);
  if (!when) return null;

  return sendPush(
    await activeMemberIds(),
    scheduledTaskMessage({ id: task.id, title: task.title, season: task.season.name, when })
  );
}
