"use client";

import { useMemo, useState } from "react";
import { Archive, Package, Search, X } from "lucide-react";

import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import {
  materialCategoryLabels,
  stockStatusLabels,
  stockStatusTones,
} from "@/components/inventory/inventory-labels";
import { MaterialArchiveAction } from "@/components/inventory/material-archive-action";
import { MaterialDialog } from "@/components/inventory/material-dialog";
import { StockHistoryDialog } from "@/components/inventory/stock-history-dialog";
import { NativeSelect } from "@/components/common/native-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/hst";
import { expiryStatus, formatStock, stockStatus } from "@/lib/stock";
import { cn } from "@/lib/utils";
import type { StockRow } from "@/server/queries/inventory";
import type { MemberOption } from "@/server/queries/users";

/**
 * Filtered on the client, like the recipe library and unlike the findings
 * list: the shed is small and already on the page, and narrowing it down is
 * something you do while standing in front of the shelves, not something you
 * send to anyone.
 */
export function StockTable({
  rows,
  archived = [],
  members,
  seasons,
  currentSeasonId,
  canWrite,
}: {
  rows: StockRow[];
  archived?: StockRow[];
  members: MemberOption[];
  seasons?: { id: string; name: string }[];
  currentSeasonId?: string;
  /**
   * Boleh mengubah gudang.
   *
   * Prop, bukan `<CanWrite>`: berkas ini komponen klien, dan `CanWrite`
   * menanyakan sesi di server. Diputuskan sekali di halamannya, lalu diturunkan.
   *
   * **Bukan penjagaan.** Kolom yang hilang cuma kerapian; yang menahan
   * perubahan data tetap `guardWrite` di Server Action-nya.
   */
  canWrite: boolean;
}) {
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Only categories that actually have something in them. A dropdown listing
  // six empty options is a dropdown that wastes a tap every time.
  const categories = useMemo(() => {
    const present = new Set(rows.map((row) => row.category));
    return Object.entries(materialCategoryLabels).filter(([value]) =>
      present.has(value as StockRow["category"]),
    );
  }, [rows]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const source = showArchived ? archived : rows;

    return source.filter((row) => {
      if (category && row.category !== category) return false;
      return !needle || row.name.toLowerCase().includes(needle);
    });
  }, [rows, archived, showArchived, category, query]);

  if (rows.length === 0) return <EmptyStock />;

  return (
    <>
      {/* Always here, even over three rows. It was hidden below seven at
          first, on the theory that a filter over a short list looks like
          something is missing — but the first person to go looking for it
          could not find it, and a control that vanishes is worse than one
          that is briefly redundant. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari bahan"
            aria-label="Cari bahan"
            className="pl-8"
          />
        </div>

        <NativeSelect
          aria-label="Saring berdasarkan kategori"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-44"
        >
          <option value="">Semua kategori</option>
          {categories.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>

        {archived.length > 0 ? (
          <Button
            variant={showArchived ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowArchived((current) => !current)}
          >
            <Archive className="size-4" aria-hidden />
            {showArchived ? "Lihat yang aktif" : `Arsip (${archived.length})`}
          </Button>
        ) : null}

        {category || query ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCategory("");
              setQuery("");
            }}
          >
            <X className="size-4" aria-hidden />
            Bersihkan
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground text-sm">
              Nggak ada bahan yang cocok. Coba ganti kata kunci atau
              kategorinya.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Below md the table is unreadable even scrolling, so the same rows
          become cards — the shed is checked from a phone. */}
      <div className="grid gap-3 md:hidden">
        {visible.map((row) => (
          <StockCard
            key={row.id}
            row={row}
            members={members}
            seasons={seasons}
            currentSeasonId={currentSeasonId}
            canWrite={canWrite}
          />
        ))}
      </div>

      <Card
        className={cn(
          "hidden overflow-hidden py-0",
          visible.length > 0 && "md:block",
        )}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">Bahan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Minimum</TableHead>
                <TableHead className="w-28">Status</TableHead>
                {canWrite ? (
                  <TableHead className="w-48 text-right">Aksi</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => {
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
                      {row.notes ? (
                        <span className="text-muted-foreground block text-xs font-normal">
                          {row.notes}
                        </span>
                      ) : null}
                      <ExpiryNote row={row} />
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
                          stockStatusTones[status],
                        )}
                      >
                        {stockStatusLabels[status]}
                      </Badge>
                    </TableCell>
                    {canWrite ? (
                      <TableCell className="w-48">
                        <div className="flex items-center justify-end gap-1">
                          <AdjustStockDialog
                            material={row}
                            members={members}
                            direction="out"
                            seasons={seasons}
                            currentSeasonId={currentSeasonId}
                          />
                          <AdjustStockDialog
                            material={row}
                            members={members}
                            direction="in"
                          />
                          <StockHistoryDialog material={row} compact />
                          <MaterialDialog material={row} compact />
                          <MaterialArchiveAction material={row} compact />
                        </div>
                      </TableCell>
                    ) : null}
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
  seasons,
  currentSeasonId,
  canWrite,
}: {
  row: StockRow;
  members: MemberOption[];
  seasons?: { id: string; name: string }[];
  currentSeasonId?: string;
  canWrite: boolean;
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
            {row.notes ? (
              <p className="text-muted-foreground mt-0.5 text-xs">
                {row.notes}
              </p>
            ) : null}
            <ExpiryNote row={row} />
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "shrink-0 border-transparent",
              stockStatusTones[status],
            )}
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
          <div className={canWrite ? "flex items-center gap-1" : "hidden"}>
            <AdjustStockDialog
              material={row}
              members={members}
              direction="out"
              seasons={seasons}
              currentSeasonId={currentSeasonId}
            />
            <AdjustStockDialog
              material={row}
              members={members}
              direction="in"
            />
            <StockHistoryDialog material={row} compact />
            <MaterialDialog material={row} compact />
            <MaterialArchiveAction material={row} compact />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Only speaks up when there is something to say. */
function ExpiryNote({ row }: { row: StockRow }) {
  const status = expiryStatus(row.expiresAt);
  if (status === "NONE" || status === "OK" || !row.expiresAt) return null;

  return (
    <span
      className={cn(
        "block text-xs font-normal",
        status === "EXPIRED"
          ? "text-destructive"
          : "text-amber-700 dark:text-amber-400",
      )}
    >
      {status === "EXPIRED" ? "Kedaluwarsa" : "Kedaluwarsa"}{" "}
      {formatDate(row.expiresAt)}
    </span>
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
