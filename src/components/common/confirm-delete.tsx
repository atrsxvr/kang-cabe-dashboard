"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import type { ActionResult } from "@/server/actions/result";

/**
 * Deletion is irreversible and there is no audit trail, so it always asks
 * first. `consequence` is where the caller spells out what else goes with it —
 * a generic "are you sure" teaches the user to click through without reading.
 */
export function ConfirmDelete({
  title,
  itemName,
  consequence,
  action,
  fields,
  label = "Hapus",
  iconOnly = false,
}: {
  title: string;
  itemName: string;
  consequence?: string;
  action: (formData: FormData) => Promise<ActionResult>;
  /** Sent with the action, e.g. the row id and its season. */
  fields: Record<string, string>;
  label?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onConfirm = () => {
    startTransition(async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        formData.set(key, value);
      }

      const result = await action(formData);

      if (!result.ok) {
        // Kept open: the message often says what to fix before retrying, such
        // as which recipes still use a material.
        toast.error(result.message);
        return;
      }

      setOpen(false);
      toast.success(`${itemName} dihapus.`);
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size={iconOnly ? "icon" : "sm"}
          aria-label={iconOnly ? `${label} ${itemName}` : undefined}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
          {iconOnly ? null : label}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="text-foreground font-medium">{itemName}</span>
            {consequence ? ` — ${consequence}` : null}
            {" Tindakan ini tidak bisa dibatalkan."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              // Confirming runs a server action; letting the dialog close on
              // its own would hide an error the user needs to see.
              event.preventDefault();
              onConfirm();
            }}
            className="bg-destructive hover:bg-destructive/90 text-white"
          >
            {pending ? "Menghapus…" : label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
