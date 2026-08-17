"use client";

import { useEffect, useMemo, useState } from "react";
import { getUiReportingStatus } from "./reporting-status";
import type { ReportingBoardItem, RosterTableRow } from "./types";
import type { ScanEntry } from "./ScanResponseFooter";

export type WizardStep = "checkout" | "scratch";

export interface UseReportingSessionArgs {
  board: ReportingBoardItem[];
}

export interface ReportingSessionState {
  // selection
  selectedEntryId: string | null;
  setSelectedEntryId: (v: string | null) => void;
  selected: ReportingBoardItem | null;

  // wizard step
  wizardStep: WizardStep;
  setWizardStep: (v: WizardStep) => void;

  // optimistic reported (per session)
  optimisticReportedBySession: Record<string, Set<string>>;
  setOptimisticReportedBySession: (
    v:
      | Record<string, Set<string>>
      | ((prev: Record<string, Set<string>>) => Record<string, Set<string>>),
  ) => void;

  // scan footer
  recentScans: ScanEntry[];
  pushScanEntry: (result: unknown, fallbackOk: boolean) => void;

  // roster mark in-flight
  markingIds: Set<string>;
  setMarkingIds: (
    v: Set<string> | ((prev: Set<string>) => Set<string>),
  ) => void;

  // reveal in-flight
  isRevealing: boolean;
  setIsRevealing: (v: boolean) => void;

  // entry-switch transition
  isEntrySwitching: boolean;
  setIsEntrySwitching: (v: boolean) => void;

  // reopen confirm dialog
  isReopenConfirmOpen: boolean;
  setIsReopenConfirmOpen: (v: boolean) => void;

  // history drawer
  historyDetailOpenId: string | null;
  setHistoryDetailOpenId: (v: string | null) => void;

  // timer drawer
  timerDrawerEntryId: string | null;
  setTimerDrawerEntryId: (v: string | null) => void;

  // derived status flags (for the open programme)
  sessionStatus: string;
  isTimedOut: boolean;
  isReset: boolean;
  isPreStart: boolean;
  isInProgress: boolean;
  isClosed: boolean;
  checkoutCompletedAt: string | null;

  // helpers
  closeDetail: () => void;
}

/**
 * Encapsulates every piece of in-memory session state: which entry is open,
 * what wizard step is showing, the optimistic reported map, and the in-flight
 * sets that gate UI buttons.
 */
export function useReportingSession({
  board,
}: UseReportingSessionArgs): ReportingSessionState {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<WizardStep>("checkout");
  const [recentScans, setRecentScans] = useState<ScanEntry[]>([]);
  const [optimisticReportedBySession, setOptimisticReportedBySession] =
    useState<Record<string, Set<string>>>({});
  const [isEntrySwitching, setIsEntrySwitching] = useState(false);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [isRevealing, setIsRevealing] = useState(false);
  const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false);
  const [historyDetailOpenId, setHistoryDetailOpenId] = useState<string | null>(
    null,
  );
  const [timerDrawerEntryId, setTimerDrawerEntryId] = useState<string | null>(
    null,
  );

  const selected = useMemo(
    () => board.find((item) => item.id === selectedEntryId) ?? null,
    [board, selectedEntryId],
  );

  const session = selected?.reportingSession ?? null;
  const checkoutCompletedAt = session?.checkoutCompletedAt ?? null;

  // Resume where the session actually is, so a refresh mid-draw doesn't drop
  // the stage manager back into checkout.
  useEffect(() => {
    setWizardStep(checkoutCompletedAt ? "scratch" : "checkout");
  }, [checkoutCompletedAt]);

  const sessionStatus = getUiReportingStatus(
    session?.status,
    session?.windowEndsAt ?? null,
    true,
  );
  const isTimedOut = sessionStatus === "TIMED_OUT";
  const isReset = sessionStatus === "RESET";
  const isPreStart =
    !session ||
    sessionStatus === "NOT_STARTED" ||
    sessionStatus === "RESET" ||
    isTimedOut;
  const isInProgress = sessionStatus === "IN_PROGRESS";
  const isClosed = sessionStatus === "CLOSED";

  const pushScanEntry = (result: unknown, fallbackOk: boolean) => {
    const r = (result ?? {}) as {
      success?: boolean;
      message?: string;
      reason?: string;
      error?: string;
      participant?: {
        name?: string;
        chestNumber?: string | null;
        groupName?: string | null;
      };
    };
    const ok = r.success ?? fallbackOk;
    const duplicate =
      (r.reason ?? "").toLowerCase().includes("already") ||
      (r.message ?? "").toLowerCase().includes("already");
    const name = r.participant?.name;
    const chest = r.participant?.chestNumber;
    const title = name
      ? `${name}${chest ? ` (${chest})` : ""}`
      : ok
        ? "Marked present"
        : (r.error ?? r.message ?? "Scan failed");
    const detail = ok
      ? duplicate
        ? "Already reported"
        : (r.participant?.groupName ?? "Marked present")
      : (r.message ?? r.reason ?? "Not found in this programme");
    setRecentScans((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ok,
          duplicate,
          title,
          detail,
          at: Date.now(),
        },
        ...prev,
      ].slice(0, 20),
    );
  };

  const closeDetail = () => {
    setIsEntrySwitching(false);
    setSelectedEntryId(null);
  };

  return {
    selectedEntryId,
    setSelectedEntryId,
    selected,
    wizardStep,
    setWizardStep,
    optimisticReportedBySession,
    setOptimisticReportedBySession,
    recentScans,
    pushScanEntry,
    markingIds,
    setMarkingIds,
    isRevealing,
    setIsRevealing,
    isEntrySwitching,
    setIsEntrySwitching,
    isReopenConfirmOpen,
    setIsReopenConfirmOpen,
    historyDetailOpenId,
    setHistoryDetailOpenId,
    timerDrawerEntryId,
    setTimerDrawerEntryId,
    sessionStatus,
    isTimedOut,
    isReset,
    isPreStart,
    isInProgress,
    isClosed,
    checkoutCompletedAt,
    closeDetail,
  };
}

/** Convenience: row key for a roster row (used for in-flight tracking). */
export function rosterRowKey(row: RosterTableRow): string {
  return row.assignmentId;
}
