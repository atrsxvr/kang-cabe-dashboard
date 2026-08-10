import type { Metadata } from "next";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { InventoryViews } from "@/components/inventory/inventory-views";
import { MaterialDialog } from "@/components/inventory/material-dialog";
import { ShoppingList } from "@/components/inventory/shopping-list";
import { StockOpnameDialog } from "@/components/inventory/stock-opname-dialog";
import { StockTable } from "@/components/inventory/stock-table";
import { ToolDialog } from "@/components/inventory/tool-dialog";
import { ToolList } from "@/components/inventory/tool-list";
import { stockStatus } from "@/lib/stock";
import {
  listShoppingNotes,
  listStock,
  listTools,
  selectRestock,
  selectToolNeeds,
} from "@/server/queries/inventory";
import { listActiveMembers } from "@/server/queries/users";

export const metadata: Metadata = { title: "Inventaris & Alat" };

export default async function InventoryPage() {
  // Shed data is shared across seasons, so there is no season to resolve —
  // but the read is still live, hence connection().
  await connection();

  const [rows, tools, notes, members] = await Promise.all([
    listStock(),
    listTools(),
    listShoppingNotes(),
    listActiveMembers(),
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

      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        <Tile value={rows.length} label="Bahan terdaftar" />
        <Tile value={restock.length} label="Perlu dibeli" warn={restock.length > 0} />
        <Tile value={outOfStock} label="Stok habis" warn={outOfStock > 0} />
      </div>

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
  value: number;
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
