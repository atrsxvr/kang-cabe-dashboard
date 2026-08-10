"use client";

import { useState, useTransition } from "react";
import { History } from "lucide-react";

import { stockReasonLabels } from "@/components/inventory/inventory-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/hst";
import { formatStock } from "@/lib/stock";
import { cn } from "@/lib/utils";
import { getMaterialMovements } from "@/server/actions/inventory";
import type { MovementRow, StockRow } from "@/server/queries/inventory";

/**
 * Answers "kenapa NPK tinggal segini".
 *
 * Every path that changes stock already writes a movement — buying, a task's
 * recorded usage, a correction from an opname. Until this existed they were
 * being written and never read, which is the same as not recording them at
 * all.
 */
export function StockHistoryDialog({
  material,
  compact = false,
}: {
  material: StockRow;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MovementRow[] | null>(null);
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      setRows(await getMaterialMovements(material.id));
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Refetched every time: stock moves while the page is open, and a
        // cached list would quietly disagree with the number above it.
        if (next) load();
        else setRows(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={compact ? "size-8" : undefined}
          aria-label={`Riwayat stok ${material.name}`}
        >
          <History className="size-4" aria-hidden />
          {compact ? null : "Riwayat"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Riwayat Stok — {material.name}</DialogTitle>
          <DialogDescription>
            Sekarang {formatStock(material.stock, material.unit)}. Terbaru di
            atas, maksimal 30 catatan.
          </DialogDescription>
        </DialogHeader>

        {pending && rows === null ? (
          <Skeleton />
        ) : rows && rows.length > 0 ? (
          <ol className="grid gap-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="grid gap-1 rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      row.delta < 0
                        ? "text-destructive"
                        : "text-emerald-700 dark:text-emerald-400"
                    )}
                  >
                    {row.delta > 0 ? "+" : "−"}
                    {formatStock(Math.abs(row.delta), material.unit)}
                  </span>
                  <Badge variant="secondary" className="shrink-0">
                    {stockReasonLabels[row.reason]}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  {formatDate(row.createdAt)}
                  {row.actor ? ` · ${row.actor.name}` : null}
                </p>
                {row.note ? <p className="text-xs">{row.note}</p> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Belum ada pergerakan stok untuk bahan ini.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-muted h-16 animate-pulse rounded-md" />
      ))}
    </div>
  );
}
