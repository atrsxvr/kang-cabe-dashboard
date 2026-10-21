"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Says the phone has lost its connection before anything fails because of it.
 *
 * In the field the signal comes and goes, and a form saved into a dead
 * connection just spins. Knowing first means waiting a moment instead of
 * typing everything twice. Disappears by itself when the signal returns.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    // The server renders as online; the real state arrives on hydration.
    () => true
  );

  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-sm text-amber-900 dark:text-amber-200"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      <span>
        HP-mu sedang offline. Yang disimpan sekarang akan gagal — tunggu sampai
        tersambung lagi.
      </span>
    </div>
  );
}
