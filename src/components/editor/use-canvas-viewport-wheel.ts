"use client";

import { type RefObject, useEffect } from "react";
import { clampEditorZoom } from "./editor-chrome";

/**
 * Trackpad / mouse wheel on the canvas viewport:
 * - Ctrl/Cmd + wheel → zoom
 * - Wheel otherwise → pan (scroll)
 */
export function useCanvasViewportWheel(
  scrollRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  setZoom: (value: number | ((prev: number) => number)) => void,
) {
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta =
          e.deltaMode === WheelEvent.DOM_DELTA_LINE
            ? e.deltaY * 16
            : e.deltaMode === WheelEvent.DOM_DELTA_PAGE
              ? e.deltaY * 400
              : e.deltaY;
        setZoom((prev) => clampEditorZoom(prev * Math.exp(-delta * 0.008)));
        return;
      }

      if (e.deltaX === 0 && e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaX;
      el.scrollTop += e.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrollRef, enabled, setZoom]);
}
