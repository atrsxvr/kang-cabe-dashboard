import "server-only";

import { prisma } from "@/lib/prisma";
import { weekendRange } from "@/lib/hst";

/**
 * Outstanding tasks due on this week's Saturday or Sunday, for the given
 * season. DONE tasks are excluded — the card exists to say what still needs
 * doing, not how much was scheduled.
 */
export async function countWeekendTasks(
  seasonId: string,
  now: Date = new Date()
): Promise<{ outstanding: number; total: number; from: Date; to: Date }> {
  const { start, end, saturday, sunday } = weekendRange(now);

  const where = { seasonId, dueDate: { gte: start, lt: end } };

  const [outstanding, total] = await Promise.all([
    prisma.task.count({ where: { ...where, status: { not: "DONE" } } }),
    prisma.task.count({ where }),
  ]);

  return { outstanding, total, from: saturday, to: sunday };
}
