import { formatStock } from "@/lib/stock";
import type { TaskRow } from "@/server/queries/tasks";

/**
 * Said before a task is deleted, when deleting it moves stock.
 *
 * Only a task whose usage was recorded ever took anything out of the shed, so
 * only that one puts anything back — said out loud, because a number quietly
 * rising in Gudang after deleting a task looks like a bug.
 */
export function deleteConsequence(task: TaskRow): string | undefined {
  if (!task.usageRecordedAt || task.materials.length === 0) return undefined;

  const items = task.materials
    .map((item) => `${formatStock(item.amount, item.unit)} ${item.name}`)
    .join(", ");

  return `bahannya sudah dipotong dari gudang. ${items} dikembalikan ke stok, dan biayanya keluar dari laporan musim ini.`;
}
