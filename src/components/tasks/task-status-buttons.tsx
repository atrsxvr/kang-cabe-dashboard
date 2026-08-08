"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
}: {
  taskId: string;
  seasonId: string;
  status: Status;
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

  return (
    <div className="flex items-center gap-1">
      {previous ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => move(previous)}
          aria-label={`Pindahkan ke ${labels[previous]}`}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
      ) : null}

      {next ? (
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
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
      ) : null}
    </div>
  );
}
