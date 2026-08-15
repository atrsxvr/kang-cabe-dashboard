"use client";

import { useState } from "react";
import { BarChart3, PieChart, ReceiptText, Users } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function FinanceViews({
  summary,
  entries,
  sharing,
  seasons,
  entryCount,
}: {
  summary: React.ReactNode;
  entries: React.ReactNode;
  sharing: React.ReactNode;
  seasons: React.ReactNode;
  entryCount: number;
}) {
  const [view, setView] = useState("summary");

  return (
    <Tabs value={view} onValueChange={setView}>
      <TabsList className="mb-4">
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
      <TabsContent value="sharing">{sharing}</TabsContent>
      <TabsContent value="seasons">{seasons}</TabsContent>
    </Tabs>
  );
}
