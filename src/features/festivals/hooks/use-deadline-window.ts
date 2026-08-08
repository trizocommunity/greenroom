"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseInstant } from "@/core/datetime";
import {
  computeState,
  type DeadlineWindowState,
  nextDeadlineWindowTransition,
} from "@/features/festivals/services/deadline-window";

type DeadlineLike = string | Date | null | undefined;

/**
 * Live view of a team-leader action window. The returned state flips on
 * its own when the window opens or closes while the page is open, so a
 * leader sitting on the page can't keep acting past the deadline.
 *
 * `justLocked` pulses once on the OPEN → CLOSED transition (for a toast).
 */
export function useDeadlineWindow(
  startInput: DeadlineLike,
  endInput: DeadlineLike,
) {
  const start = useMemo(() => parseInstant(startInput ?? null), [startInput]);
  const end = useMemo(() => parseInstant(endInput ?? null), [endInput]);

  const [state, setState] = useState<DeadlineWindowState>(() =>
    computeState(start, end),
  );
  const [justLocked, setJustLocked] = useState(false);
  const previousStateRef = useRef(state);

  useEffect(() => {
    let timer: number | undefined;

    const sync = () => {
      const nextState = computeState(start, end);
      setState(nextState);

      const transitionAt = nextDeadlineWindowTransition(start, end);
      if (!transitionAt) return;

      timer = window.setTimeout(
        sync,
        Math.max(0, transitionAt.getTime() - Date.now()),
      );
    };

    sync();

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [start, end]);

  useEffect(() => {
    if (previousStateRef.current === "OPEN" && state === "CLOSED") {
      setJustLocked(true);
      const clearPulse = window.setTimeout(() => setJustLocked(false), 0);
      previousStateRef.current = state;
      return () => window.clearTimeout(clearPulse);
    }
    previousStateRef.current = state;
  }, [state]);

  return {
    state,
    isLocked: state !== "OPEN",
    isUnconfigured: state === "UNCONFIGURED",
    isUpcoming: state === "UPCOMING",
    isClosed: state === "CLOSED",
    justLocked,
    start,
    end,
  };
}
