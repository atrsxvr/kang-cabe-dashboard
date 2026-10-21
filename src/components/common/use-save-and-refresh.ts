"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Closes a dialog only once the page behind it shows what was saved.
 *
 * The old order — close, toast, then `router.refresh()` — announced
 * "Catatan ditambahkan" over a list that still lacked it for as long as the
 * page took to re-render: four seconds on Keuangan, measured. Long enough to
 * decide it had failed and type it again, which is how a payment gets
 * recorded twice.
 *
 * Here the refresh runs in a transition, and the dialog's own closing is part
 * of that transition, so both land in the same frame. The toast waits for the
 * transition to finish. `refreshing` keeps the submit button in its
 * "Menyimpan…" state through the wait.
 */
export function useSaveAndRefresh() {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const message = useRef<string | null>(null);

  useEffect(() => {
    if (!refreshing && message.current) {
      toast.success(message.current);
      message.current = null;
    }
  }, [refreshing]);

  /** Call after a successful save: `close` runs with the refreshed page. */
  const finish = (success: string, close: () => void) => {
    message.current = success;
    startRefresh(() => {
      router.refresh();
      close();
    });
  };

  return { refreshing, finish };
}
