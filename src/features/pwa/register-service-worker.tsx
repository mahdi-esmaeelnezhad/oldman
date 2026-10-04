"use client";

import { useEffect } from "react";

/** Registers the minimal service worker used for Chromium installability. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Ignore registration failures in local/dev environments.
    });
  }, []);

  return null;
}
