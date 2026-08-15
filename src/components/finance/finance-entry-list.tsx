import { ReceiptText } from "lucide-react";

import { ConfirmDelete } from "@/components/common/confirm-delete";
import { FinanceEntryDialog } from "@/components/finance/finance-entry-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/hst";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deleteFinanceEntry } from "@/server/actions/finance";
import type { FinanceEntryRow } from "@/server/queries/finance";

export function FinanceEntryList({
  entries,
  seasonId,
  photoEnabled,
}: {
  entries: FinanceEntryRow[];
  seasonId: string;
  photoEnabled: boolean;
}) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="bg-muted rounded-lg p-3">
            <ReceiptText className="text-muted-foreground size-6" aria-hidden />
          </div>
          <div>
            <p className="font-medium">Belum ada catatan</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Upah, sewa, transport — yang nggak lewat gudang atau timbangan
              dicatat di sini.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {entries.map((entry) => {
        const outgoing = entry.type === "EXPENSE";

        return (
          <Card key={entry.id} className="py-3">
            <CardContent className="flex flex-wrap items-center gap-3 px-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{entry.description}</p>
                <p className="text-muted-foreground text-xs">
                  {formatDate(entry.date)}
                  {entry.proofUrl ? (
                    <>
                      {" · "}
                      <a
                        href={entry.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        lihat nota
                      </a>
                    </>
                  ) : null}
                </p>
              </div>

              <Badge variant="secondary" className="border-transparent">
                {entry.category}
              </Badge>

              <p
                className={cn(
                  "font-semibold tabular-nums",
                  outgoing
                    ? "text-destructive"
                    : "text-emerald-700 dark:text-emerald-400"
                )}
              >
                {outgoing ? "−" : "+"}
                {formatRupiah(entry.amount)}
              </p>

              <div className="flex items-center gap-0.5">
                <FinanceEntryDialog
                  seasonId={seasonId}
                  entry={entry}
                  photoEnabled={photoEnabled}
                />
                <ConfirmDelete
                  title="Hapus catatan ini?"
                  itemName={entry.description}
                  consequence="Foto notanya ikut terhapus."
                  action={deleteFinanceEntry}
                  fields={{ entryId: entry.id, seasonId }}
                  iconOnly
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
