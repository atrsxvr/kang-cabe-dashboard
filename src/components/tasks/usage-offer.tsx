"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";

import { TaskUsageDialog } from "@/components/tasks/task-usage-action";
import type { TaskRow } from "@/server/queries/tasks";
import type { MemberOption } from "@/server/queries/users";

/**
 * Asking for "Catat pemakaian" the moment a task is marked Selesai.
 *
 * Still a question, never a deduction: finishing a task is not proof its mix
 * was used. But the deduction used to wait for someone to notice the button —
 * sometimes until Tutup Musim — and the shed read fuller than it was for the
 * whole season in between.
 *
 * Held here, above the views, rather than on a card: a card marked Selesai
 * moves to another column and is mounted afresh, which would drop a dialog
 * opened on the old one. The board, the table and the task form all ask
 * through `useOfferUsage`; the dashboard, which has no provider, links here
 * with `?catat=` instead.
 */

type OfferUsage = (taskId: string) => void;

const OfferContext = createContext<OfferUsage | null>(null);

/** Null outside the tasks page. */
export function useOfferUsage(): OfferUsage | null {
  return useContext(OfferContext);
}

export function UsageOfferProvider({
  tasks,
  seasonId,
  members,
  canRecordUsage,
  initialTaskId,
  children,
}: {
  tasks: TaskRow[];
  seasonId: string;
  members: MemberOption[];
  canRecordUsage: boolean;
  /** From `?catat=`: the dashboard sending someone here to answer it. */
  initialTaskId?: string;
  children: React.ReactNode;
}) {
  const [offered, setOffered] = useState<string | null>(initialTaskId ?? null);
  const router = useRouter();

  const task = offered ? tasks.find((row) => row.id === offered) : undefined;

  // Asked only once the page itself shows the task done. Until the refresh
  // lands, the row here is the one from before the change — and the materials
  // it would list may be the ones the form has just replaced.
  const open = Boolean(
    canRecordUsage &&
      task &&
      task.status === "DONE" &&
      task.materials.length > 0 &&
      !task.usageRecordedAt
  );

  const close = () => {
    setOffered(null);
    // Off the address too, so a reload does not ask again.
    const url = new URL(window.location.href);
    if (url.searchParams.has("catat")) {
      url.searchParams.delete("catat");
      router.replace(`${url.pathname}${url.search}`, { scroll: false });
    }
  };

  return (
    <OfferContext.Provider value={setOffered}>
      {children}
      {task && open ? (
        <TaskUsageDialog
          key={task.id}
          task={task}
          seasonId={seasonId}
          members={members}
          open
          onOpenChange={(next) => {
            if (!next) close();
          }}
          offered
        />
      ) : null}
    </OfferContext.Provider>
  );
}
