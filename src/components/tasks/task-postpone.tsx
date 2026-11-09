"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { dateInputValue } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/hst";
import { postponeTask } from "@/server/actions/tasks";

const DAY = 86_400_000;

/** `YYYY-MM-DD`, `days` after today in Jakarta. */
function daysFromToday(days: number): string {
  return new Date(Date.parse(dateInputValue()) + days * DAY)
    .toISOString()
    .slice(0, 10);
}

const weekday = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

/**
 * Moves a task that could not be done today — rain, or nobody free.
 *
 * Offered on what is due today or already late, because that is when the
 * question comes up. Tomorrow and the day after are one tap each; any other
 * day is one more. The HST moves with the date.
 */
export function TaskPostpone({
  taskId,
  seasonId,
  title,
  dueDate,
}: {
  taskId: string;
  seasonId: string;
  title: string;
  dueDate: Date;
}) {
  const [open, setOpen] = useState(false);
  const [other, setOther] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const today = dateInputValue();
  const choices = [
    { label: "Besok", value: daysFromToday(1) },
    { label: "Lusa", value: daysFromToday(2) },
  ];

  const move = (value: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("seasonId", seasonId);
      formData.set("dueDate", value);

      const result = await postponeTask(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setOpen(false);
      setOther("");
      toast.success(`${title} dipindah ke ${formatDate(new Date(value))}.`);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setOther("");
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground h-8"
          aria-label={`Tunda ${title}`}
        >
          <CalendarClock className="size-4" aria-hidden />
          Tunda
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Tunda ke kapan?</DialogTitle>
          <DialogDescription>
            {title} · rencananya {formatDate(dueDate)}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {choices.map((choice) => (
            <Button
              key={choice.label}
              type="button"
              variant="secondary"
              className="h-auto flex-col gap-0 py-2"
              disabled={pending}
              onClick={() => move(choice.value)}
            >
              <span>{choice.label}</span>
              <span className="text-muted-foreground text-xs font-normal">
                {weekday.format(new Date(choice.value))}
              </span>
            </Button>
          ))}
        </div>

        <div className="grid gap-2 border-t pt-3">
          <Label htmlFor={`postpone-${taskId}`}>Tanggal lain</Label>
          <div className="flex gap-2">
            <Input
              id={`postpone-${taskId}`}
              type="date"
              min={today}
              value={other}
              onChange={(event) => setOther(event.target.value)}
              className="w-44"
            />
            <Button
              type="button"
              disabled={pending || !other || other < today}
              onClick={() => move(other)}
            >
              Pindahkan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
