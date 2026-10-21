import { formatRupiah } from "@/lib/money";

/**
 * Wages, as this garden pays them.
 *
 * The four members work unpaid; hired hands come for two jobs — preparing
 * the land and pulling out the spent plants — and are paid per job once it
 * is done, out of the garden's cash. So a wage is an ordinary expense in the
 * "Upah" category that also says which job and to whom: that is what anyone
 * looking at the wage bill asks.
 */

export const LABOR_CATEGORY = "Upah";

/** Offered as suggestions, not a fixed list: a third kind of job can appear. */
export const LABOR_JOB_SUGGESTIONS = ["Olah lahan", "Cabut tanam"] as const;

export function isLaborEntry(type: string, category: string): boolean {
  return type === "EXPENSE" && category === LABOR_CATEGORY;
}

/**
 * The wage bill split by job, biggest first: "olah lahan Rp 1.500.000 ·
 * cabut tanam Rp 600.000". Jobs typed with different capitalisation are one
 * job. Wages recorded before jobs were asked for read as "lainnya".
 */
export function laborBreakdown(
  entries: { laborJob: string | null; amount: number }[]
): string {
  const byJob = new Map<string, number>();
  for (const entry of entries) {
    const job = entry.laborJob?.trim().toLowerCase() || "lainnya";
    byJob.set(job, (byJob.get(job) ?? 0) + entry.amount);
  }

  return [...byJob.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id"))
    .map(([job, amount]) => `${job} ${formatRupiah(amount)}`)
    .join(" · ");
}
