"use client";

import { useEffect } from "react";

/**
 * Keeps the service worker registered on every page, quietly.
 *
 * A subscription lives only as long as its worker, and the browser checks
 * for a newer sw.js when it is registered again — so registering on each
 * visit, not only on the settings page, is what keeps notifications arriving
 * after an update.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.error("[pwa] service worker", error));
  }, []);

  return null;
}
