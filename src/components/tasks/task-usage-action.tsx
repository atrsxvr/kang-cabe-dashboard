"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, PackageMinus } from "lucide-react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/common/native-select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatAmount } from "@/lib/dose";
import { formatDate } from "@/lib/hst";
import { cn } from "@/lib/utils";
import { recordTaskUsage } from "@/server/actions/tasks";
import type { TaskRow } from "@/server/queries/tasks";
import type { MemberOption } from "@/server/queries/users";

/**
 * Takes a finished task's materials out of the shed — on request, not
 * automatically.
 *
 * Deducting the moment a task is marked done would be wrong often enough to
 * matter: tasks get moved to "Selesai" to tidy the board, and a mix half done
 * is not the same as a mix used. So the offer sits on the card and waits, and
 * the action itself is idempotent, which is what lets the same button work
 * whichever way the task reached "Selesai".
 */
export function TaskUsageAction({
  task,
  seasonId,
  members,
}: {
  task: TaskRow;
  seasonId: string;
  members: MemberOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  // Whoever did the work, not whoever keeps the shed — the movement log should
  // answer "who used this", and logistics only ever sees the task second-hand.
  const [actorId, setActorId] = useState(task.assignees[0]?.userId ?? "");
  const router = useRouter();

  if (task.materials.length === 0) return null;

  if (task.usageRecordedAt) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <CheckCheck className="size-3.5 shrink-0" aria-hidden />
        Stok dikurangi {formatDate(task.usageRecordedAt)}
      </span>
    );
  }

  const done = task.status === "DONE";

  const onConfirm = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", task.id);
      formData.set("seasonId", seasonId);
      formData.set("actorId", actorId);

      const result = await recordTaskUsage(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setOpen(false);
      toast.success("Pemakaian tercatat, stok gudang sudah dikurangi.");
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant={done ? "default" : "ghost"}
          className={cn(!done && "text-muted-foreground")}
        >
          <PackageMinus className="size-4" aria-hidden />
          Catat pemakaian
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kurangi stok gudang?</AlertDialogTitle>
          <AlertDialogDescription>
            {done
              ? "Bahan berikut akan keluar dari stok dan tercatat di riwayat gudang."
              : "Tugas ini belum ditandai selesai. Kalau bahannya memang sudah dipakai, catat saja sekarang."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="grid gap-1 rounded-md border p-3 text-sm">
          {task.materials.map((item) => (
            <li key={item.materialId} className="flex justify-between gap-2">
              <span className="min-w-0 truncate">{item.name}</span>
              <span className="tabular-nums">
                −{formatAmount(item.amount)} {item.unit}
              </span>
            </li>
          ))}
        </ul>

        <div className="grid gap-2">
          <Label htmlFor={`usage-actor-${task.id}`}>Dipakai oleh</Label>
          <NativeSelect
            id={`usage-actor-${task.id}`}
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
          >
            <option value="">— tidak disebutkan —</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <p className="text-muted-foreground text-xs">
          Sekali saja. Kalau ternyata keliru, perbaiki lewat tombol + / − di
          Inventaris supaya alasannya ikut tercatat.
        </p>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <Button
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? "Mencatat…" : "Kurangi stok"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
