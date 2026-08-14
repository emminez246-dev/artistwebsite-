"use client";

import { useEffect } from "react";

/**
 * Registers the service worker as soon as the app loads — not gated behind
 * the push-notification subscribe flow — since a registered service worker
 * is one of the browser criteria for "Add to Home Screen" installability.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  }, []);

  return null;
}
