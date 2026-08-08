"use client";

import { useState } from "react";
import { KanbanSquare, List, NotebookPen } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * View switching is local UI state, so it stays on the client — the three
 * panels are server-rendered and passed in as slots, keeping the task queries
 * on the server.
 */
export function TaskViews({
  board,
  table,
  logbook,
  logbookCount,
}: {
  board: React.ReactNode;
  table: React.ReactNode;
  logbook: React.ReactNode;
  logbookCount: number;
}) {
  const [view, setView] = useState("board");

  return (
    <Tabs value={view} onValueChange={setView}>
      <TabsList className="mb-4">
        <TabsTrigger value="board">
          <KanbanSquare className="size-4" aria-hidden />
          Board
        </TabsTrigger>
        <TabsTrigger value="table">
          <List className="size-4" aria-hidden />
          Tabel
        </TabsTrigger>
        <TabsTrigger value="logbook">
          <NotebookPen className="size-4" aria-hidden />
          Logbook
          {logbookCount > 0 ? (
            <span className="text-muted-foreground ml-1 text-xs tabular-nums">
              {logbookCount}
            </span>
          ) : null}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="board">{board}</TabsContent>
      <TabsContent value="table">{table}</TabsContent>
      <TabsContent value="logbook">{logbook}</TabsContent>
    </Tabs>
  );
}
