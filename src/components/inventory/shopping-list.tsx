"use client";

import { useState } from "react";
import { Check, Copy, Share2, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";

import {
  materialCategoryLabels,
  stockStatusLabels,
  stockStatusTones,
} from "@/components/inventory/inventory-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { describeShortfall, formatStock, stockStatus } from "@/lib/stock";
import { cn } from "@/lib/utils";
import type { StockRow } from "@/server/queries/inventory";

/**
 * Plain text rather than a document. It is read in a farm supply shop from a
 * phone, and pasting into WhatsApp is how this group already passes lists
 * around.
 */
function asText(rows: StockRow[]): string {
  const today = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const lines = rows.map((row) => {
    const shortfall = describeShortfall(row.stock, row.minStock, row.unit);
    // How short, not just that it is short — the number to buy.
    const needed = Math.max(0, row.minStock - row.stock);
    const suggestion =
      needed > 0 ? ` → beli min. ${formatStock(needed, row.unit)}` : "";

    return `• ${row.name} — ${shortfall}${suggestion}`;
  });

  return [`Daftar Belanja — ${today}`, "", ...lines].join("\n");
}

export function ShoppingList({ rows }: { rows: StockRow[] }) {
  const [copied, setCopied] = useState(false);

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="rounded-lg bg-emerald-500/12 p-3">
            <Check
              className="size-6 text-emerald-700 dark:text-emerald-400"
              aria-hidden
            />
          </div>
          <div>
            <p className="font-medium">Tidak ada yang perlu dibeli</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Semua bahan masih di atas batas minimumnya.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const text = asText(rows);

  const onCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Daftar belanja disalin.");
    setTimeout(() => setCopied(false), 2000);
  };

  const onShare = async () => {
    // Only present on a phone; the button is hidden otherwise rather than
    // failing when tapped.
    await navigator
      .share({ title: "Daftar Belanja Kebun", text })
      .catch(() => {});
  };

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          <strong className="text-foreground">{rows.length} bahan</strong> di
          bawah batas minimum.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onCopy}>
            {copied ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
            {copied ? "Tersalin" : "Salin"}
          </Button>
          {canShare ? (
            <Button size="sm" onClick={onShare}>
              <Share2 className="size-4" aria-hidden />
              Bagikan
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3">
        {rows.map((row) => {
          const status = stockStatus(row.stock, row.minStock);
          const needed = Math.max(0, row.minStock - row.stock);

          return (
            <Card key={row.id} className="py-3">
              <CardContent className="grid gap-2 px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <ShoppingBasket
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                  <span className="font-medium">{row.name}</span>
                  <Badge
                    variant="secondary"
                    className={cn("border-transparent", stockStatusTones[status])}
                  >
                    {stockStatusLabels[status]}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {materialCategoryLabels[row.category]}
                  </span>
                </div>

                <p className="text-muted-foreground text-sm">
                  {describeShortfall(row.stock, row.minStock, row.unit)}
                  {needed > 0 ? (
                    <>
                      {" · "}
                      <strong className="text-foreground">
                        beli min. {formatStock(needed, row.unit)}
                      </strong>
                    </>
                  ) : null}
                </p>

                {/* The payoff of one shared row for recipes and stock: the
                    list says what stops working if this is not bought. */}
                {row.usedBy.length > 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Dipakai racikan: {row.usedBy.map((r) => r.name).join(", ")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <details className="rounded-lg border">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium">
          Pratinjau teks yang akan disalin
        </summary>
        <pre className="text-muted-foreground overflow-x-auto border-t px-4 py-3 text-xs whitespace-pre-wrap">
          {text}
        </pre>
      </details>
    </div>
  );
}
