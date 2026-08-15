"use client";

import { useState } from "react";
import {
  BarChart3,
  HandCoins,
  PieChart,
  ReceiptText,
  Users,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function FinanceViews({
  summary,
  entries,
  sharing,
  capital,
  seasons,
  entryCount,
}: {
  summary: React.ReactNode;
  entries: React.ReactNode;
  sharing: React.ReactNode;
  capital: React.ReactNode;
  seasons: React.ReactNode;
  entryCount: number;
}) {
  const [view, setView] = useState("summary");

  return (
    <Tabs value={view} onValueChange={setView}>
      {/* TabsList is inline-flex w-fit, so on a phone it ran off the side with
          nothing to scroll — five tabs need 480px and no phone is that wide.
          It scrolls now rather than wrapping: a tab sliced off at the edge is
          its own invitation to swipe, and the header stays one row tall.
          justify-start matters — the default centring would push the first tab
          out of reach on the left. */}
      <TabsList className="mb-4 max-w-full justify-start overflow-x-auto">
        <TabsTrigger value="summary">
          <PieChart className="size-4" aria-hidden />
          Rincian
        </TabsTrigger>
        <TabsTrigger value="entries">
          <ReceiptText className="size-4" aria-hidden />
          Catatan
          {entryCount > 0 ? (
            <span className="text-muted-foreground ml-1 text-xs tabular-nums">
              {entryCount}
            </span>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="capital">
          <HandCoins className="size-4" aria-hidden />
          Modal
        </TabsTrigger>
        <TabsTrigger value="sharing">
          <Users className="size-4" aria-hidden />
          Bagi Hasil
        </TabsTrigger>
        <TabsTrigger value="seasons">
          <BarChart3 className="size-4" aria-hidden />
          Antar Musim
        </TabsTrigger>
      </TabsList>

      <TabsContent value="summary">{summary}</TabsContent>
      <TabsContent value="entries">{entries}</TabsContent>
      <TabsContent value="capital">{capital}</TabsContent>
      <TabsContent value="sharing">{sharing}</TabsContent>
      <TabsContent value="seasons">{seasons}</TabsContent>
    </Tabs>
  );
}
