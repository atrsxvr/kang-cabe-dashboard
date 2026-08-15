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
import { archiveMaterial } from "@/server/actions/inventory";
import type { StockRow } from "@/server/queries/inventory";

/**
 * Archive, not delete — the same call the seasons list makes, for a sharper
 * reason.
 *
 * A material's movement log now carries what each usage cost and which season
 * it was charged to. Deleting the row cascades all of it away, so a season
 * closed months ago would quietly report a different total than it did on the
 * day it closed. Archiving takes the material out of the shed and out of every
 * picker while leaving the history intact.
 */
export function MaterialArchiveAction({
  material,
  compact = false,
}: {
  material: StockRow;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const archived = Boolean(material.archivedAt);

  const submit = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("materialId", material.id);
      if (archived) formData.set("restore", "true");

      const result = await archiveMaterial(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(
        archived
          ? `${material.name} dikembalikan.`
          : `${material.name} diarsipkan.`,
      );
      router.refresh();
    });
  };

  // Bringing one back is not a decision anyone needs talking through.
  if (archived) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={submit}
        aria-label={`Kembalikan ${material.name}`}
      >
        <ArchiveRestore className="size-4" aria-hidden />
        Kembalikan
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={compact ? "size-8" : "text-muted-foreground"}
          aria-label={`Arsipkan ${material.name}`}
        >
          <Archive className="size-4" aria-hidden />
          {compact ? null : "Arsipkan"}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arsipkan bahan ini?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="text-foreground font-medium">{material.name}</span>{" "}
            bakal hilang dari daftar stok dan dari pilihan racikan maupun tugas.
            {material._count.recipeItems > 0
              ? ` Racikan yang sudah memakainya (${material._count.recipeItems}) tetap utuh.`
              : null}{" "}
            Riwayat stok dan biaya musim yang sudah tercatat nggak berubah, dan
            bisa dikembalikan lagi kapan aja.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            {pending ? "Mengarsipkan…" : "Arsipkan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
