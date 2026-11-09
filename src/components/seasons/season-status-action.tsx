"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { SeasonCloseDialog } from "@/components/seasons/season-close-dialog";
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
import {
  advanceSeasonStatus,
  revertSeasonStatus,
} from "@/server/actions/seasons";
import {
  nextSeasonStatus,
  previousSeasonStatus,
  type seasonStatuses,
} from "@/server/actions/schemas";

const labels: Record<string, string> = {
  PLANNING: "Perencanaan",
  ACTIVE: "Berjalan",
  HARVESTING: "Panen",
  COMPLETED: "Selesai",
  ARCHIVED: "Arsip",
};

/** What moving into each stage means, said before it happens. */
const meaning: Record<string, string> = {
  ACTIVE:
    "Tandanya bibit sudah ditanam. Umur tanaman (HST) mulai dihitung dari tanggal tanam, dan musim ini jadi pilihan utama di semua halaman.",
  HARVESTING: "Tandanya cabai sudah mulai dipetik. Tidak ada data yang berubah.",
};

export function SeasonStatusAction({
  seasonId,
  seasonName,
  status,
  canClose,
}: {
  seasonId: string;
  seasonName: string;
  status: (typeof seasonStatuses)[number];
  /** Tutup Musim is Admin's alone; others see that instead of a button. */
  canClose: boolean;
}) {
  const next = nextSeasonStatus(status);
  const previous = previousSeasonStatus(status);

  // Selesai is when the margin gets split, so that one step goes through the
  // closing checklist instead of happening on a single tap.
  //
  // Selesai itself goes through the same component: see `done`.
  let forward: React.ReactNode = null;
  if (next === "COMPLETED" && !canClose) {
    forward = (
      <span className="text-muted-foreground text-xs">Ditutup oleh Admin</span>
    );
  } else if (next === "COMPLETED" || status === "COMPLETED") {
    forward = (
      <SeasonCloseDialog
        seasonId={seasonId}
        seasonName={seasonName}
        done={status === "COMPLETED"}
      />
    );
  } else if (next) {
    forward = (
      <AdvanceButton seasonId={seasonId} seasonName={seasonName} next={next} />
    );
  }

  if (!forward && !previous) return null;

  return (
    <div className="flex items-center gap-1">
      {previous ? (
        <RevertButton
          seasonId={seasonId}
          from={labels[status]}
          to={labels[previous]}
        />
      ) : null}
      {forward}
    </div>
  );
}

/**
 * Asks first. The stage it moves to changes with the row, so the button's own
 * word is easy to tap past — and it used to happen on the first touch.
 */
function AdvanceButton({
  seasonId,
  seasonName,
  next,
}: {
  seasonId: string;
  seasonName: string;
  next: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onConfirm = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("seasonId", seasonId);
      const result = await advanceSeasonStatus(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setOpen(false);
      toast.success(`${seasonName} sekarang tahap ${labels[next]}.`);
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="secondary"
          className="h-8"
          title={`Ubah status ke ${labels[next]}`}
        >
          <ArrowRight className="size-3.5" aria-hidden />
          {labels[next]}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Pindahkan {seasonName} ke tahap {labels[next]}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {meaning[next] ?? ""} Kalau salah tekan, bisa dikembalikan lewat
            tombol panah balik di sebelahnya.
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
            {pending ? "Mengubah…" : `Ya, ${labels[next]}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** One step back, for a stage tapped by mistake. */
function RevertButton({
  seasonId,
  from,
  to,
}: {
  seasonId: string;
  from: string;
  to: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onConfirm = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("seasonId", seasonId);
      const result = await revertSeasonStatus(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(`Status dikembalikan ke ${to}.`);
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
          aria-label={`Kembalikan ke ${to}`}
          title={`Kembalikan ke ${to}`}
        >
          <Undo2 className="size-4" aria-hidden />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kembalikan ke tahap {to}?</AlertDialogTitle>
          <AlertDialogDescription>
            Untuk tahap {from} yang terlanjur dipilih. Tidak ada catatan yang
            hilang, hanya statusnya yang mundur satu langkah.
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
            {pending ? "Mengembalikan…" : `Kembalikan ke ${to}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
