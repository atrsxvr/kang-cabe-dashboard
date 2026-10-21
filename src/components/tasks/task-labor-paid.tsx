import { HandCoins } from "lucide-react";

import { formatRupiah } from "@/lib/money";
import type { TaskRow } from "@/server/queries/tasks";

/**
 * "Upah borongan Rp 1.500.000 · Mang Asep" on a task whose job was paid for.
 *
 * Read from the wage entries that name this task, so it can never disagree
 * with Keuangan — and so a job paid twice shows both, which is the point.
 */
export function TaskLaborPaid({ task }: { task: Pick<TaskRow, "laborPayments"> }) {
  if (task.laborPayments.length === 0) return null;

  const total = task.laborPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const payees = [
    ...new Set(task.laborPayments.map((payment) => payment.payee).filter(Boolean)),
  ];

  return (
    <p className="text-muted-foreground flex items-center gap-1 text-xs tabular-nums">
      <HandCoins className="size-3.5 shrink-0" aria-hidden />
      <span>
        Upah borongan {formatRupiah(total)}
        {payees.length > 0 ? ` · ${payees.join(", ")}` : ""}
        {task.laborPayments.length > 1 ? ` (${task.laborPayments.length}× bayar)` : ""}
      </span>
    </p>
  );
}
