import type { Metadata } from "next";
import { connection } from "next/server";
import { Receipt } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { InventoryViews } from "@/components/inventory/inventory-views";
import { MaterialDialog } from "@/components/inventory/material-dialog";
import { ShoppingList } from "@/components/inventory/shopping-list";
import { StockOpnameDialog } from "@/components/inventory/stock-opname-dialog";
import { StockTable } from "@/components/inventory/stock-table";
import { ToolDialog } from "@/components/inventory/tool-dialog";
import { ToolList } from "@/components/inventory/tool-list";
import { formatRupiah } from "@/lib/money";
import { stockStatus } from "@/lib/stock";
import {
  countUnpricedPurchases,
  listShoppingNotes,
  listStock,
  listTools,
  selectRestock,
  selectToolNeeds,
  totalStockValue,
} from "@/server/queries/inventory";
import { listActiveMembers } from "@/server/queries/users";

export const metadata: Metadata = { title: "Inventaris & Alat" };

export default async function InventoryPage() {
  // Shed data is shared across seasons, so there is no season to resolve —
  // but the read is still live, hence connection().
  await connection();

  const [rows, tools, notes, members, unpriced] = await Promise.all([
    listStock(),
    listTools(),
    listShoppingNotes(),
    listActiveMembers(),
    countUnpricedPurchases(),
  ]);

  const restock = selectRestock(rows);
  const { replace, service } = selectToolNeeds(tools);
  const outstandingNotes = notes.filter((note) => !note.done).length;
  const attention = replace.length + service.length;
  const outOfStock = rows.filter(
    (row) => stockStatus(row.stock, row.minStock) === "OUT_OF_STOCK"
  ).length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Inventaris & Alat"
          description="Stok saprodi dan kondisi alat kerja. Berlaku untuk semua musim."
        />
        <div className="flex flex-wrap gap-2">
          <StockOpnameDialog rows={rows} members={members} />
          <ToolDialog />
          <MaterialDialog />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Tile value={rows.length} label="Bahan terdaftar" />
        <Tile value={restock.length} label="Perlu dibeli" warn={restock.length > 0} />
        <Tile value={outOfStock} label="Stok habis" warn={outOfStock > 0} />
        <Tile
          value={formatRupiah(totalStockValue(rows))}
          label="Nilai barang di gudang"
        />
      </div>

      {unpriced > 0 ? (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <Receipt className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            {unpriced} catatan belanja belum ada harganya, jadi nilai gudang di
            atas masih kurang. Buka <span className="font-medium">Riwayat</span>{" "}
            di bahannya buat ngisi.
          </p>
        </div>
      ) : null}

      <InventoryViews
        restockCount={
          restock.length + replace.length + service.length + outstandingNotes
        }
        attentionCount={attention}
        stock={<StockTable rows={rows} members={members} />}
        shopping={
          <ShoppingList
            rows={restock}
            replace={replace}
            service={service}
            notes={notes}
            members={members}
          />
        }
        tools={<ToolList tools={tools} members={members} />}
      />
    </>
  );
}

function Tile({
  value,
  label,
  warn = false,
}: {
  value: number | string;
  label: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border px-2 py-1.5 sm:px-3 sm:py-2">
      <p
        className={
          warn
            ? "text-base font-semibold tabular-nums text-amber-700 sm:text-lg dark:text-amber-400"
            : "text-base font-semibold tabular-nums sm:text-lg"
        }
      >
        {value}
      </p>
      <p className="text-muted-foreground text-[11px] leading-tight sm:text-xs">
        {label}
      </p>
    </div>
  );
}
