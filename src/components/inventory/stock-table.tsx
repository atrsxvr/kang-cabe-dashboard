import { Package } from "lucide-react";

import { ConfirmDelete } from "@/components/common/confirm-delete";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import {
  materialCategoryLabels,
  stockStatusLabels,
  stockStatusTones,
} from "@/components/inventory/inventory-labels";
import { MaterialDialog } from "@/components/inventory/material-dialog";
import { StockHistoryDialog } from "@/components/inventory/stock-history-dialog";
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
import { formatStock, stockStatus } from "@/lib/stock";
import { cn } from "@/lib/utils";
import { deleteMaterial } from "@/server/actions/recipes";
import type { StockRow } from "@/server/queries/inventory";
import type { MemberOption } from "@/server/queries/users";

export function StockTable({
  rows,
  members,
}: {
  rows: StockRow[];
  members: MemberOption[];
}) {
  if (rows.length === 0) return <EmptyStock />;

  return (
    <>
      {/* Below md the table is unreadable even scrolling, so the same rows
          become cards — the shed is checked from a phone. */}
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <StockCard key={row.id} row={row} members={members} />
        ))}
      </div>

      <Card className="hidden overflow-hidden py-0 md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">Bahan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Minimum</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-48 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const status = stockStatus(row.stock, row.minStock);

                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.name}
                      {row.usedBy.length > 0 ? (
                        <span className="text-muted-foreground block text-xs font-normal">
                          dipakai {row.usedBy.length} racikan
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {materialCategoryLabels[row.category]}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatStock(row.stock, row.unit)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {formatStock(row.minStock, row.unit)}
                    </TableCell>
                    <TableCell className="w-28">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "w-full justify-center border-transparent",
                          stockStatusTones[status]
                        )}
                      >
                        {stockStatusLabels[status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-48">
                      <div className="flex items-center justify-end gap-0.5">
                        <AdjustStockDialog
                          material={row}
                          members={members}
                          direction="out"
                        />
                        <AdjustStockDialog
                          material={row}
                          members={members}
                          direction="in"
                        />
                        <StockHistoryDialog material={row} compact />
                        <MaterialDialog material={row} compact />
                        <ConfirmDelete
                          title="Hapus bahan ini?"
                          itemName={row.name}
                          consequence={
                            row._count.recipeItems > 0
                              ? `masih dipakai ${row._count.recipeItems} racikan.`
                              : "Riwayat stoknya ikut terhapus."
                          }
                          action={deleteMaterial}
                          fields={{ materialId: row.id }}
                          iconOnly
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  );
}

function StockCard({
  row,
  members,
}: {
  row: StockRow;
  members: MemberOption[];
}) {
  const status = stockStatus(row.stock, row.minStock);

  return (
    <Card className="py-3">
      <CardContent className="grid gap-2 px-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">{row.name}</p>
            <p className="text-muted-foreground text-xs">
              {materialCategoryLabels[row.category]}
              {row.usedBy.length > 0
                ? ` · dipakai ${row.usedBy.length} racikan`
                : null}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={cn("shrink-0 border-transparent", stockStatusTones[status])}
          >
            {stockStatusLabels[status]}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm tabular-nums">
            <span className="font-semibold">
              {formatStock(row.stock, row.unit)}
            </span>
            <span className="text-muted-foreground text-xs">
              {" "}
              / min {formatStock(row.minStock, row.unit)}
            </span>
          </p>
          <div className="flex items-center gap-0.5">
            <AdjustStockDialog
              material={row}
              members={members}
              direction="out"
            />
            <AdjustStockDialog material={row} members={members} direction="in" />
            <StockHistoryDialog material={row} compact />
            <MaterialDialog material={row} compact />
            <ConfirmDelete
              title="Hapus bahan ini?"
              itemName={row.name}
              consequence={
                row._count.recipeItems > 0
                  ? `masih dipakai ${row._count.recipeItems} racikan.`
                  : "Riwayat stoknya ikut terhapus."
              }
              action={deleteMaterial}
              fields={{ materialId: row.id }}
              iconOnly
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyStock() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="bg-muted rounded-lg p-3">
          <Package className="text-muted-foreground size-6" aria-hidden />
        </div>
        <div>
          <p className="font-medium">Belum ada bahan terdaftar</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Bahan yang sama dipakai Pustaka Racikan, jadi cukup didaftarkan
            sekali di sini.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
