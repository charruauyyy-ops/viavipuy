"use client";

import { useEffect, useRef } from "react";
import { pingActividad } from "@/lib/pingActividad";

const INTERVAL_MS = 60_000;
const THROTTLE_MS = 30_000;

export function useHeartbeat(enabled: boolean) {
  const lastPingRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    function throttledPing() {
      const now = Date.now();
      if (now - lastPingRef.current < THROTTLE_MS) return;
      lastPingRef.current = now;
      pingActividad();
    }

    throttledPing();

    const interval = setInterval(throttledPing, INTERVAL_MS);

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        throttledPing();
      }
    }

    function handleInteraction() {
      throttledPing();
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("click", handleInteraction, { passive: true });
    window.addEventListener("scroll", handleInteraction, { passive: true });
    window.addEventListener("keydown", handleInteraction, { passive: true });

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [enabled]);
}
