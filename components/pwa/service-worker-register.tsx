"use client";

import { useEffect } from "react";

/**
 * Registers the SAM service worker on the client.
 *
 * Mounted once in the root layout. The registration is what — together with the
 * web manifest — makes SAM installable as a standalone web app and enables the
 * offline app shell. It is a no-op during SSR and on browsers without support.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Register after load so it never competes with the initial render.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("[SAM] Service worker registration failed:", error);
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
