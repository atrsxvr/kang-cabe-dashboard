import { Wheat } from "lucide-react";

import { ConfirmDelete } from "@/components/common/confirm-delete";
import { HarvestDialog } from "@/components/harvest/harvest-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateHst, formatDate } from "@/lib/hst";
import { formatKg, gradeLabels, gradeTones } from "@/lib/harvest";
import { cn } from "@/lib/utils";
import { deleteHarvest } from "@/server/actions/harvest";
import type { HarvestRow } from "@/server/queries/harvest";
import type { MemberOption } from "@/server/queries/users";

export function HarvestList({
  harvests,
  seasonId,
  seasonStart,
  members,
}: {
  harvests: HarvestRow[];
  seasonId: string;
  /** Tanggal tanam, buat menghitung HST tiap petikan. */
  seasonStart: Date;
  members: MemberOption[];
}) {
  if (harvests.length === 0) return <EmptyHarvest />;

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {harvests.map((row) => (
          <Card key={row.id} className="py-3">
            <CardContent className="grid gap-2 px-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {formatDate(row.harvestDate)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    HST {calculateHst(seasonStart, row.harvestDate)}
                    {row.recordedBy ? ` · ${row.recordedBy.name}` : null}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatKg(row.totalKg)}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <GradeChip grade="GOOD" kg={row.goodKg} />
                <GradeChip grade="REJECT" kg={row.rejectKg} />
              </div>

              {row.notes ? (
                <p className="text-muted-foreground text-xs">{row.notes}</p>
              ) : null}

              <div className="flex items-center gap-1 border-t pt-2">
                <HarvestDialog
                  seasonId={seasonId}
                  members={members}
                  harvest={row}
                />
                <ConfirmDelete
                  title="Hapus catatan panen ini?"
                  itemName={formatDate(row.harvestDate)}
                  consequence="Sisa yang belum terjual ikut berubah."
                  action={deleteHarvest}
                  fields={{ harvestId: row.id, seasonId }}
                  iconOnly
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden overflow-hidden py-0 md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">HST</TableHead>
                <TableHead className="text-right">{gradeLabels.GOOD}</TableHead>
                <TableHead className="text-right">
                  {gradeLabels.REJECT}
                </TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Dicatat</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {harvests.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatDate(row.harvestDate)}
                    {row.notes ? (
                      <span className="text-muted-foreground line-clamp-1 block text-xs font-normal">
                        {row.notes}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {calculateHst(seasonStart, row.harvestDate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatKg(row.goodKg)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatKg(row.rejectKg)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatKg(row.totalKg)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.recordedBy?.name ?? "—"}
                  </TableCell>
                  <TableCell className="w-24">
                    <div className="flex items-center justify-end gap-1">
                      <HarvestDialog
                        seasonId={seasonId}
                        members={members}
                        harvest={row}
                      />
                      <ConfirmDelete
                        title="Hapus catatan panen ini?"
                        itemName={formatDate(row.harvestDate)}
                        consequence="Sisa yang belum terjual ikut berubah."
                        action={deleteHarvest}
                        fields={{ harvestId: row.id, seasonId }}
                        iconOnly
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  );
}

function GradeChip({ grade, kg }: { grade: "GOOD" | "REJECT"; kg: number }) {
  if (kg <= 0) return null;

  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent", gradeTones[grade])}
    >
      {gradeLabels[grade]} {formatKg(kg)}
    </Badge>
  );
}

function EmptyHarvest() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="bg-muted rounded-lg p-3">
          <Wheat className="text-muted-foreground size-6" aria-hidden />
        </div>
        <div>
          <p className="font-medium">Belum ada panen tercatat</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Catat tiap petikan, walau cuma beberapa kilo. Sisa yang belum
            terjual dihitung dari sini.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
