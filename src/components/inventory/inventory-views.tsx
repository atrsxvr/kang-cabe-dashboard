"use client";

import { useState } from "react";
import { Package, ShoppingBasket, Wrench } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Panels are server-rendered and passed in as slots, so switching tabs stays
 * client-side state while the queries stay on the server.
 */
export function InventoryViews({
  stock,
  shopping,
  tools,
  restockCount,
  attentionCount,
}: {
  stock: React.ReactNode;
  shopping: React.ReactNode;
  tools: React.ReactNode;
  restockCount: number;
  attentionCount: number;
}) {
  const [view, setView] = useState("stock");

  return (
    <Tabs value={view} onValueChange={setView}>
      <TabsList className="mb-4 max-w-full justify-start overflow-x-auto">
        <TabsTrigger value="stock">
          <Package className="size-4" aria-hidden />
          Stok Bahan
        </TabsTrigger>
        <TabsTrigger value="shopping">
          <ShoppingBasket className="size-4" aria-hidden />
          Belanja
          {/* The count is the reason to open this tab at all. */}
          {restockCount > 0 ? (
            <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 text-xs tabular-nums text-amber-800 dark:text-amber-300">
              {restockCount}
            </span>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="tools">
          <Wrench className="size-4" aria-hidden />
          Alat Kebun
          {attentionCount > 0 ? (
            <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 text-xs tabular-nums text-amber-800 dark:text-amber-300">
              {attentionCount}
            </span>
          ) : null}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="stock">{stock}</TabsContent>
      <TabsContent value="shopping">{shopping}</TabsContent>
      <TabsContent value="tools">{tools}</TabsContent>
    </Tabs>
  );
}
