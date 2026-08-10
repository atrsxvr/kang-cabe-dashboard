import type { Metadata } from "next";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { InventoryViews } from "@/components/inventory/inventory-views";
import { MaterialDialog } from "@/components/inventory/material-dialog";
import { ShoppingList } from "@/components/inventory/shopping-list";
import { StockTable } from "@/components/inventory/stock-table";
import { ToolDialog } from "@/components/inventory/tool-dialog";
import { ToolList } from "@/components/inventory/tool-list";
import { stockStatus } from "@/lib/stock";
import { listStock, listTools, selectRestock } from "@/server/queries/inventory";
import { listActiveMembers } from "@/server/queries/users";

export const metadata: Metadata = { title: "Inventaris & Alat" };

export default async function InventoryPage() {
  // Shed data is shared across seasons, so there is no season to resolve —
  // but the read is still live, hence connection().
  await connection();

  const [rows, tools, members] = await Promise.all([
    listStock(),
    listTools(),
    listActiveMembers(),
  ]);

  const restock = selectRestock(rows);
  const attention = tools.filter((tool) => tool.condition !== "GOOD").length;
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
        restockCount={restock.length}
        attentionCount={attention}
        stock={<StockTable rows={rows} members={members} />}
        shopping={<ShoppingList rows={restock} />}
        tools={<ToolList tools={tools} />}
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
