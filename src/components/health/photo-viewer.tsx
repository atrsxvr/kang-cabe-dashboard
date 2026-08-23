"use client";

import { useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const LEVELS = [1, 1.5, 2, 3, 4] as const;

/**
 * Full-screen photo viewer for diagnosing a finding — leaf spots and insect
 * damage are the detail that matters, and a thumbnail cannot show them.
 *
 * Panning is the container's own scrolling rather than pointer maths: it
 * already works with a trackpad, a touch drag, and arrow keys, and cannot
 * fight the page underneath.
 */
export function PhotoViewer({
  src,
  caption,
  children,
}: {
  src: string;
  caption: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(0);

  const zoom = LEVELS[level];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reopening at 4× on a different part of the photo is disorienting.
        if (!next) setLevel(0);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        showCloseButton
        // sm:max-w-none is the part that matters: DialogContent ships with
        // sm:max-w-sm, and an unprefixed max-w cannot outrank a variant, so the
        // viewer was silently capped at 384px — useless for inspecting a leaf.
        className="max-h-[92dvh] w-[min(96vw,72rem)] max-w-none gap-3 p-3 sm:max-w-none sm:p-4"
      >
        <DialogTitle className="text-base">Foto temuan</DialogTitle>
        <DialogDescription className="sr-only">
          Gunakan tombol perbesar untuk melihat detail. Geser gambar untuk
          berpindah bagian.
        </DialogDescription>

        <div className="bg-muted/40 max-h-[70dvh] overflow-auto rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={caption}
            onClick={() =>
              setLevel((l) => (l === LEVELS.length - 1 ? 0 : l + 1))
            }
            style={{ width: `${zoom * 100}%`, maxWidth: "none" }}
            className={
              zoom === 1
                ? "mx-auto block cursor-zoom-in object-contain"
                : "block cursor-zoom-out"
            }
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground min-w-0 truncate text-xs">
            {caption}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="icon"
              variant="secondary"
              aria-label="Perkecil"
              disabled={level === 0}
              onClick={() => setLevel((l) => Math.max(0, l - 1))}
            >
              <Minus className="size-4" aria-hidden />
            </Button>
            <span
              className="w-12 text-center text-xs tabular-nums"
              aria-live="polite"
            >
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="icon"
              variant="secondary"
              aria-label="Perbesar"
              disabled={level === LEVELS.length - 1}
              onClick={() =>
                setLevel((l) => Math.min(LEVELS.length - 1, l + 1))
              }
            >
              <Plus className="size-4" aria-hidden />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Kembalikan ke ukuran awal"
              disabled={level === 0}
              onClick={() => setLevel(0)}
            >
              <RotateCcw className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
