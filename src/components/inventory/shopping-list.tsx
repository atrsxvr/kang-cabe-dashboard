"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  MessageCircle,
  Share2,
  ShoppingBasket,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import {
  materialCategoryLabels,
  stockStatusLabels,
  stockStatusTones,
  toolConditionLabels,
} from "@/components/inventory/inventory-labels";
import { ShoppingNotes } from "@/components/inventory/shopping-notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { describeShortfall, restockSuggestion, stockStatus } from "@/lib/stock";
import { cn } from "@/lib/utils";
import type {
  ShoppingNoteRow,
  StockRow,
  ToolRow,
} from "@/server/queries/inventory";
import type { MemberOption } from "@/server/queries/users";

const suggestionFor = (row: StockRow) =>
  restockSuggestion(
    row.stock,
    row.minStock,
    row.unit,
    row.purchaseUnit,
    row.purchaseSize,
  );

/**
 * Plain text rather than a document. It is read in a farm supply shop from a
 * phone, and pasting into WhatsApp is how this group already passes lists
 * around.
 */
function asText(
  rows: StockRow[],
  replace: ToolRow[],
  service: ToolRow[],
  notes: ShoppingNoteRow[],
): string {
  const today = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const parts: string[] = [`Daftar Belanja — ${today}`];

  if (rows.length > 0) {
    parts.push("", "BAHAN");
    for (const row of rows) {
      parts.push(
        `• ${row.name} — ${describeShortfall(row.stock, row.minStock, row.unit)} → ${suggestionFor(row).text}`,
      );
    }
  }

  if (replace.length > 0) {
    parts.push("", "ALAT PERLU DIGANTI");
    for (const tool of replace) {
      const why =
        tool.quantity === 0
          ? "habis/hilang"
          : toolConditionLabels[tool.condition];
      parts.push(`• ${tool.name} — ${why.toLowerCase()}`);
    }
  }

  if (service.length > 0) {
    parts.push("", "ALAT PERLU DISERVIS");
    for (const tool of service) {
      parts.push(`• ${tool.name}${tool.notes ? ` — ${tool.notes}` : ""}`);
    }
  }

  const outstanding = notes.filter((note) => !note.done);
  if (outstanding.length > 0) {
    parts.push("", "TAMBAHAN");
    for (const note of outstanding) parts.push(`• ${note.text}`);
  }

  return parts.join("\n");
}

export function ShoppingList({
  rows,
  replace,
  service,
  notes,
  members,
}: {
  rows: StockRow[];
  replace: ToolRow[];
  service: ToolRow[];
  notes: ShoppingNoteRow[];
  members: MemberOption[];
}) {
  const [copied, setCopied] = useState(false);

  const outstanding = notes.filter((note) => !note.done).length;
  const total = rows.length + replace.length + service.length + outstanding;
  const text = asText(rows, replace, service, notes);

  const onCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Daftar belanja disalin.");
    setTimeout(() => setCopied(false), 2000);
  };

  const onShare = async () => {
    // Only present on a phone; the button is hidden otherwise rather than
    // failing when tapped.
    //
    // Text alone, no `title`. Handed both, WhatsApp on some phones kept only
    // the heading and dropped every item below it — a shopping list that
    // arrives as a date.
    await navigator.share({ text }).catch(() => {});
  };

  // Straight into WhatsApp, past the phone's share sheet and whatever each
  // phone makes of it. wa.me carries the whole text, line breaks included,
  // and opens the app to pick a chat.
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(text)}`;

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {total === 0 ? (
            "Tidak ada yang perlu diurus."
          ) : (
            <>
              <strong className="text-foreground">{total} hal</strong> perlu
              dibeli atau diurus.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onCopy}>
            {copied ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
            {copied ? "Tersalin" : "Salin"}
          </Button>
          <Button asChild size="sm">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" aria-hidden />
              WhatsApp
            </a>
          </Button>
          {canShare ? (
            <Button size="sm" variant="secondary" onClick={onShare}>
              <Share2 className="size-4" aria-hidden />
              Bagikan
            </Button>
          ) : null}
        </div>
      </div>

      {rows.length > 0 ? (
        <section className="grid gap-3">
          <h3 className="text-sm font-medium">Bahan</h3>
          {rows.map((row) => {
            const status = stockStatus(row.stock, row.minStock);
            const suggestion = suggestionFor(row);

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
                      className={cn(
                        "border-transparent",
                        stockStatusTones[status],
                      )}
                    >
                      {stockStatusLabels[status]}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {materialCategoryLabels[row.category]}
                    </span>
                  </div>

                  <p className="text-muted-foreground text-sm">
                    {describeShortfall(row.stock, row.minStock, row.unit)}
                    {" · "}
                    <strong className="text-foreground">
                      {suggestion.text}
                    </strong>
                  </p>

                  {/* The payoff of one shared row for recipes and stock: the
                      list says what stops working if this is not bought. */}
                  {row.usedBy.length > 0 ? (
                    <p className="text-muted-foreground text-xs">
                      Dipakai racikan:{" "}
                      {row.usedBy.map((r) => r.name).join(", ")}
                    </p>
                  ) : null}

                  {/* Closes the loop: buying is where stock should go back up,
                      and doing it here means it is not forgotten on the way
                      home. */}
                  <div className="flex justify-start">
                    <AdjustStockDialog
                      material={row}
                      members={members}
                      direction="in"
                      defaultAmount={suggestion.amount ?? undefined}
                      trigger={
                        <Button size="sm" variant="secondary">
                          <Check className="size-4" aria-hidden />
                          Sudah dibeli
                        </Button>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      ) : null}

      {replace.length > 0 ? (
        <ToolSection
          title="Alat perlu diganti"
          tools={replace}
          describe={(tool) =>
            tool.quantity === 0
              ? "tidak ada lagi"
              : toolConditionLabels[tool.condition].toLowerCase()
          }
        />
      ) : null}

      {service.length > 0 ? (
        <ToolSection
          title="Alat perlu diservis"
          tools={service}
          describe={(tool) => tool.notes ?? "bawa ke bengkel"}
        />
      ) : null}

      <ShoppingNotes notes={notes} members={members} />

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

function ToolSection({
  title,
  tools,
  describe,
}: {
  title: string;
  tools: ToolRow[];
  describe: (tool: ToolRow) => string;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {tools.map((tool) => (
        <Card key={tool.id} className="py-3">
          <CardContent className="flex flex-wrap items-center gap-2 px-4">
            <Wrench
              className="text-muted-foreground size-4 shrink-0"
              aria-hidden
            />
            <span className="font-medium">{tool.name}</span>
            <span className="text-muted-foreground text-sm">
              — {describe(tool)}
            </span>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
