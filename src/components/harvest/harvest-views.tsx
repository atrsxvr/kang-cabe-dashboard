"use client";

import { useState } from "react";
import { Coins, ReceiptText, Users, Wheat } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Panels are server-rendered and passed in as slots, so switching tabs stays
 * client-side state while the queries stay on the server.
 */
export function HarvestViews({
  harvest,
  sales,
  unpaid,
  unpaidCount,
  buyers,
  incompleteBuyers,
}: {
  harvest: React.ReactNode;
  sales: React.ReactNode;
  unpaid: React.ReactNode;
  unpaidCount: number;
  buyers: React.ReactNode;
  /** Buyers brought over without location or kind, waiting to be completed. */
  incompleteBuyers: number;
}) {
  const [view, setView] = useState("harvest");

  return (
    <Tabs value={view} onValueChange={setView}>
      <TabsList className="mb-4 max-w-full justify-start overflow-x-auto">
        <TabsTrigger value="harvest">
          <Wheat className="size-4" aria-hidden />
          Panen
        </TabsTrigger>
        <TabsTrigger value="sales">
          <Coins className="size-4" aria-hidden />
          Penjualan
        </TabsTrigger>
        <TabsTrigger value="unpaid">
          <ReceiptText className="size-4" aria-hidden />
          Piutang
          {/* The count is the reason to open this tab at all. */}
          {unpaidCount > 0 ? (
            <span className="ml-1 rounded-full bg-rose-500/20 px-1.5 text-xs tabular-nums text-rose-800 dark:text-rose-300">
              {unpaidCount}
            </span>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="buyers">
          <Users className="size-4" aria-hidden />
          Pembeli
          {incompleteBuyers > 0 ? (
            <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 text-xs tabular-nums text-amber-800 dark:text-amber-300">
              {incompleteBuyers}
            </span>
          ) : null}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="harvest">{harvest}</TabsContent>
      <TabsContent value="sales">{sales}</TabsContent>
      <TabsContent value="unpaid">{unpaid}</TabsContent>
      <TabsContent value="buyers">{buyers}</TabsContent>
    </Tabs>
  );
}
