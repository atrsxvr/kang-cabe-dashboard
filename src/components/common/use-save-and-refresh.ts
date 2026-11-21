"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** Long enough to register "Tersimpan ✓", short enough not to be waited on. */
const SAVED_MS = 450;

/**
 * Closes a dialog only once the page behind it shows what was saved.
 *
 * The old order — close, toast, then `router.refresh()` — announced
 * "Catatan ditambahkan" over a list that still lacked it for as long as the
 * page took to re-render: four seconds on Keuangan, measured. Long enough to
 * decide it had failed and type it again, which is how a payment gets
 * recorded twice.
 *
 * Here the refresh runs in a transition and `refreshing` keeps the submit
 * button in "Menyimpan…" through it. Once the page behind has re-rendered,
 * `saved` turns the button into a tick for a moment, and only then does the
 * dialog close and the toast appear — by which time the new row is already
 * in the list, where FreshRows lights it up.
 */
export function useSaveAndRefresh() {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [saved, setSaved] = useState(false);
  const pending = useRef<{ message: string; close: () => void } | null>(null);

  // The refresh can take this dialog's own host with it. A task saved as
  // Selesai moves to another column and its card — dialog and all — is
  // mounted afresh; a material bought from the shopping list drops off it.
  // Nothing is then left mounted to see `refreshing` turn false, and the save
  // ended in silence: no toast, and nothing the close step does (offering
  // "Catat pemakaian") ever happened. Finish it on the way out instead — the
  // page already shows the change, since that is what unmounted it.
  useEffect(
    () => () => {
      const left = pending.current;
      pending.current = null;
      if (left) {
        left.close();
        toast.success(left.message);
      }
    },
    [],
  );

  useEffect(() => {
    if (refreshing || !pending.current) return;

    const { message, close } = pending.current;
    pending.current = null;
    let done = false;

    const finishNow = () => {
      if (done) return;
      done = true;
      setSaved(false);
      close();
      toast.success(message);
    };

    // Deferred a tick rather than set here: the tick is the *result* of the
    // refresh landing, not part of rendering it.
    const show = window.setTimeout(() => setSaved(true), 0);
    const timer = window.setTimeout(finishNow, SAVED_MS);

    return () => {
      window.clearTimeout(show);
      window.clearTimeout(timer);
      // Unmounted mid-tick: the save still happened, so it is still said, and
      // the close step still runs for whatever it does beyond closing.
      finishNow();
    };
  }, [refreshing]);

  /** Call after a successful save: `close` runs once the page shows it. */
  const finish = (success: string, close: () => void) => {
    pending.current = { message: success, close };
    startRefresh(() => {
      router.refresh();
    });
  };

  return { refreshing, saved, finish };
}
