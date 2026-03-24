"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DeadlineLike = string | Date | null | undefined;

function toDate(input: DeadlineLike): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function computeLocked(deadline: Date | null, graceMs: number): boolean {
  if (!deadline) return false;
  return Date.now() >= deadline.getTime() + Math.max(0, graceMs);
}

export function useDeadlineLock(deadlineInput: DeadlineLike, graceMs = 0) {
  const deadline = useMemo(() => toDate(deadlineInput), [deadlineInput]);
  const [isLocked, setIsLocked] = useState<boolean>(() =>
    computeLocked(deadline, graceMs),
  );
  const [justLocked, setJustLocked] = useState(false);
  const wasLockedRef = useRef(isLocked);

  useEffect(() => {
    const lockedNow = computeLocked(deadline, graceMs);
    setIsLocked(lockedNow);
    wasLockedRef.current = lockedNow;

    if (!deadline || lockedNow) return;

    const delayMs = Math.max(
      0,
      deadline.getTime() + Math.max(0, graceMs) - Date.now(),
    );

    const timer = window.setTimeout(() => {
      setIsLocked(true);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [deadline, graceMs]);

  useEffect(() => {
    if (!wasLockedRef.current && isLocked) {
      setJustLocked(true);
      const clearPulse = window.setTimeout(() => setJustLocked(false), 0);
      return () => window.clearTimeout(clearPulse);
    }
    wasLockedRef.current = isLocked;
  }, [isLocked]);

  return { isLocked, justLocked, deadline };
}

