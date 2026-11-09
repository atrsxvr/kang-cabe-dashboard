"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { archiveSeason, restoreSeason } from "@/server/actions/seasons";

/**
 * Archive, not delete. A season cascades to every task, finding, harvest and
 * transaction under it — and with no authentication yet, a delete button is
 * one click between a stranger with the URL and the entire record. Archiving
 * hides the season without destroying anything, and `SeasonRestoreAction`
 * takes it back out.
 */
export function SeasonArchiveAction({
  seasonId,
  name,
  taskCount,
}: {
  seasonId: string;
  name: string;
  taskCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onConfirm = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("seasonId", seasonId);

      const result = await archiveSeason(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(`${name} diarsipkan.`);
      router.refresh();
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-8"
          aria-label={`Arsipkan ${name}`}
          title={`Arsipkan ${name}`}
        >
          <Archive className="size-4" aria-hidden />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arsipkan musim ini?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="text-foreground font-medium">{name}</span> akan
            ditandai sebagai arsip.{" "}
            {taskCount > 0
              ? `${taskCount} tugas dan seluruh catatan di dalamnya tetap tersimpan`
              : "Seluruh catatan di dalamnya tetap tersimpan"}{" "}
            dan bisa dipulihkan kapan saja lewat tombol Pulihkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? "Mengarsipkan…" : "Arsipkan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Takes an archived season back out: finished goes back to Selesai, a plan never planted to Perencanaan. */
export function SeasonRestoreAction({
  seasonId,
  name,
}: {
  seasonId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onConfirm = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("seasonId", seasonId);

      const result = await restoreSeason(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(`${name} dipulihkan.`);
      router.refresh();
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="secondary" className="h-8">
          <ArchiveRestore className="size-3.5" aria-hidden />
          Pulihkan
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pulihkan musim ini?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="text-foreground font-medium">{name}</span> kembali
            ke daftar musim dengan status sebelum diarsipkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? "Memulihkan…" : "Pulihkan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
