"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateTaskStatus } from "@/server/actions/tasks";
import { taskStatuses } from "@/server/actions/schemas";

type Status = (typeof taskStatuses)[number];

const labels: Record<Status, string> = {
  TODO: "Belum dikerjakan",
  IN_PROGRESS: "Dikerjakan",
  DONE: "Selesai",
};

/**
 * Quick-update in place of drag-and-drop: works with touch, mouse, and
 * keyboard without special handling, and never fights the horizontal scroll
 * of the board on a phone.
 */
export function TaskStatusButtons({
  taskId,
  seasonId,
  status,
  variant = "table",
}: {
  taskId: string;
  seasonId: string;
  status: Status;
  /**
   * `table` reserves a slot per button so a column cannot re-measure when the
   * status changes. `card` drops the reserved slots — a Kanban column is a
   * fixed width already — and hugs a corner instead.
   */
  variant?: "table" | "card";
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const index = taskStatuses.indexOf(status);
  const previous = index > 0 ? taskStatuses[index - 1] : null;
  const next = index < taskStatuses.length - 1 ? taskStatuses[index + 1] : null;

  const move = (target: Status) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("seasonId", seasonId);
      formData.set("status", target);

      const result = await updateTaskStatus(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(`Dipindah ke "${labels[target]}".`);
      router.refresh();
    });
  };

  const isTable = variant === "table";

  // On a card the group hugs the trailing corner, except on the last column
  // where only the back button remains — pinning that to the right would leave
  // it floating far from the card it belongs to.
  const cardAlignment = status === "DONE" ? "justify-start" : "justify-end";

  const backButton = previous ? (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => move(previous)}
      aria-label={`Pindahkan ke ${labels[previous]}`}
    >
      <ChevronLeft className="size-4" aria-hidden />
    </Button>
  ) : null;

  const forwardButton = next ? (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => move(next)}
      aria-label={`Pindahkan ke ${labels[next]}`}
    >
      {next === "DONE" ? (
        <>
          <Check className="size-4" aria-hidden />
          Selesai
        </>
      ) : (
        <ChevronRight className="size-4" aria-hidden />
      )}
    </Button>
  ) : null;

  return (
    <div
      className={cn("flex items-center gap-1", !isTable && cardAlignment)}
    >
      {isTable ? (
        <>
          {/* Slots are always occupied: an absent button leaves an equally
              sized gap, so the column cannot re-measure when status changes.
              Back is icon-only, so its slot only needs one button's width. */}
          <ButtonSlot className="min-w-9">{backButton}</ButtonSlot>
          {/* Forward carries "✓ Selesai" on the last step, the widest here. */}
          <ButtonSlot>{forwardButton}</ButtonSlot>
        </>
      ) : (
        <>
          {backButton}
          {forwardButton}
        </>
      )}
    </div>
  );
}

/**
 * Reserves the width of the widest button that can appear here ("✓ Selesai"),
 * so the row keeps its geometry whichever status the task is in.
 */
function ButtonSlot({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("flex min-w-24 items-center", className)}>
      {children}
    </span>
  );
}
