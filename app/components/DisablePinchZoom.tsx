"use client";

import { useEffect } from "react";

export default function DisablePinchZoom() {
  useEffect(() => {
    function prevent(e: Event) {
      e.preventDefault();
    }
    document.addEventListener("gesturestart", prevent, { passive: false } as AddEventListenerOptions);
    document.addEventListener("gesturechange", prevent, { passive: false } as AddEventListenerOptions);
    document.addEventListener("gestureend", prevent, { passive: false } as AddEventListenerOptions);
    return () => {
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("gesturechange", prevent);
      document.removeEventListener("gestureend", prevent);
    };
  }, []);

  return null;
}
