"use client";

import { usePathname, useRouter } from "next/navigation";
import party from "party-js";
import { useCallback, useRef, useState, useTransition } from "react";
import {
  closeProgrammeReportingAction,
  completeCheckoutAction,
  markProgrammeAssignmentsBulkAction,
  markProgrammeParticipantAction,
  reopenProgrammeReportingAction,
  resetProgrammeReportingAction,
  revealAllRemainingAction,
  revealScratchCodeAction,
  startProgrammeReportingAction,
  submitClientSideReportingAction,
} from "@/features/programmes/actions/programme-reporting.actions";
import { toast } from "@/lib/toast";
import type { ReportingBoardItem, RosterTableRow } from "./types";
import type { ReportingSessionState } from "./useReportingSession";

export type ReportingActiveAction =
  | null
  | "start"
  | "reset"
  | "close"
  | "mark"
  | "reopen"
  | "complete-checkout"
  | "reveal-all";

import type { useReportingBoard } from "./useReportingBoard";

export interface UseReportingActionsArgs {
  festivalId: string;
  festivalSlug?: string;
  session: ReportingSessionState;
  derived: ReturnType<typeof useReportingBoard>;
}

export interface ReportingActions {
  activeAction: ReportingActiveAction;
  isPending: boolean;
  confettiRef: React.RefObject<HTMLDivElement | null>;
  refreshBoard: () => void;

  onStart: () => void;
  /** Auto-start fired from URL ?autoStart; doesn't gate UI on selected. */
  onAutoStart: (programmeId: string) => void;
  onReset: () => void;
  onCompleteCheckout: () => void;
  onScratchTile: (codeLetterId: string) => void;
  onRevealAllRemaining: () => void;
  onClose: () => void;
  onReopen: () => void;
  onMarkRow: (row: RosterTableRow, checked: boolean) => Promise<void>;
  onMarkAllPresent: (assignmentIds: string[]) => void;
}

/**
 * Encapsulates every server-side action for the reporting workspace: start,
 * reset, complete-checkout, scratch tiles, close, reopen, mark single + bulk.
 * Owns the useTransition plumbing, the activeAction flag, the confetti
 * target ref, and a `refreshBoard` callback so the orchestrator never needs
 * to call `router.refresh()` itself.
 */
export function useReportingActions({
  festivalId,
  session,
  derived,
}: UseReportingActionsArgs): ReportingActions {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<ReportingActiveAction>(null);
  const confettiRef = useRef<HTMLDivElement>(null);

  const refreshBoard = useCallback(() => router.refresh(), [router]);

  const triggerConfetti = useCallback(
    (
      count: readonly [number, number] | [number, number],
      size: readonly [number, number] | [number, number],
    ) => {
      if (confettiRef.current) {
        party.confetti(confettiRef.current, {
          count: party.variation.range(count[0], count[1]),
          size: party.variation.range(size[0], size[1]),
        });
      }
    },
    [],
  );

  const onStart = () => {
    if (!session.selected) return;
    setActiveAction("start");
    startTransition(async () => {
      const res = await startProgrammeReportingAction(
        festivalId,
        session.selected!.id,
      );
      if (res.success) {
        toast.success("Reporting started");
        refreshBoard();
      } else toast.error("Failed to start reporting");
      setActiveAction(null);
    });
  };

  /**
   * Auto-start fired from the URL ?autoStart deep link. Same behaviour as
   * onStart but doesn't depend on `session.selected` — the caller has
   * already resolved the entry id from the URL.
   */
  const onAutoStart = (programmeId: string) => {
    setActiveAction("start");
    startTransition(async () => {
      try {
        await startProgrammeReportingAction(festivalId, programmeId);
        toast.success("Reporting started and announcers notified!");
      } catch (err) {
        toast.error("Failed to start reporting");
      } finally {
        setActiveAction(null);
      }
    });
  };

  const onReset = () => {
    const sid = session.selected?.reportingSession?.id;
    if (!sid) return;
    setActiveAction("reset");
    startTransition(async () => {
      const res = await resetProgrammeReportingAction(festivalId, sid);
      if (res.success) {
        const message =
          res.data && typeof res.data === "object" && "message" in res.data
            ? (res.data as { message: string }).message
            : "Reporting reset successfully";
        toast.success(message);
        refreshBoard();
      } else toast.error("Failed to reset reporting");
      setActiveAction(null);
    });
  };

  /**
   * Ends checkout and deals the tiles. After this the roster is frozen — the
   * server refuses further attendance changes, so warn before crossing.
   */
  const onCompleteCheckout = () => {
    const sid = session.selected?.reportingSession?.id;
    if (!sid) return;

    const reportedRows = derived.rosterTableRows.filter(
      (r: any) => r.isReported,
    );
    if (reportedRows.length === 0) {
      toast.error("No participants reported present.");
      return;
    }

    const letters = Array.from({ length: reportedRows.length }, (_, i) => {
      let n = i + 1;
      let s = "";
      while (n > 0) {
        const rem = (n - 1) % 26;
        s = String.fromCharCode(65 + rem) + s;
        n = Math.floor((n - 1) / 26);
      }
      return s;
    });

    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j]!, letters[i]!];
    }

    const newTiles = reportedRows.map((row: any, idx: number) => ({
      codeLetterId: `local-tile-${idx}`,
      queuePosition: idx + 1,
      code: letters[idx]!,
      revealedAt: null,
      label: row.nameColumn,
      subLabel: row.groupName ?? null,
      teamLeadName: row.mode === "team" ? (row.teamLeadName ?? null) : null,
      participantIds:
        row.mode === "team"
          ? row.teamParticipantIds
          : row.participantId
            ? [row.participantId]
            : [],
      participantId: row.mode === "individual" ? row.participantId : null,
      groupId: row.mode === "team" ? row.groupId : null,
      teamNumber: row.mode === "team" ? row.teamNumber : null,
    }));

    session.setScratchTilesBySession((prev) => ({ ...prev, [sid]: newTiles }));
    session.setLocalCheckoutCompletedBySession((prev) => ({
      ...prev,
      [sid]: true,
    }));
    toast.success(
      `Checkout complete — ${newTiles.length} code letter${
        newTiles.length === 1 ? "" : "s"
      } ready to draw.`,
    );
  };

  const onScratchTile = (codeLetterId: string) => {
    const sid = session.selected?.reportingSession?.id;
    if (!sid) return;

    session.setScratchTilesBySession((prev) => {
      const currentTiles = prev[sid] || [];
      const tileIndex = currentTiles.findIndex(
        (t) => t.codeLetterId === codeLetterId,
      );
      if (tileIndex === -1) return prev;
      if (currentTiles[tileIndex]!.revealedAt) return prev; // Already revealed

      const newTiles = [...currentTiles];
      newTiles[tileIndex] = {
        ...newTiles[tileIndex]!,
        revealedAt: new Date().toISOString(),
      };
      return { ...prev, [sid]: newTiles };
    });
    triggerConfetti([50, 80], [1.2, 1.8]);
  };

  const onRevealAllRemaining = () => {
    const sid = session.selected?.reportingSession?.id;
    if (!sid) return;

    session.setScratchTilesBySession((prev) => {
      const currentTiles = prev[sid] || [];
      const newTiles = currentTiles.map((t) =>
        t.revealedAt ? t : { ...t, revealedAt: new Date().toISOString() },
      );
      return { ...prev, [sid]: newTiles };
    });
  };

  const onClose = () => {
    const sid = session.selected?.reportingSession?.id;
    const programmeType = session.selected?.programme?.type;
    if (!sid) return;

    const tiles = session.scratchTilesBySession[sid] || [];
    const submissionTiles = tiles.map((t) => ({
      code: t.code!,
      queuePosition: t.queuePosition,
      participantId: t.participantId ?? null,
      groupId: t.groupId ?? null,
      teamNumber: t.teamNumber ?? null,
      participantIds: t.participantIds,
    }));

    setActiveAction("close");
    startTransition(async () => {
      try {
        const res = await submitClientSideReportingAction(
          festivalId,
          sid,
          submissionTiles,
        );
        if (res.success) {
          triggerConfetti([40, 60], [0.8, 1.2]);
          toast.success(
            programmeType === "GROUP"
              ? "Reporting submitted — every team that drew a tile is reported."
              : "Reporting submitted — everyone who drew a tile is reported.",
          );
          // Fast hand-off: if the programme is on a stage, jump straight to the
          // Judgement screen with the Start Judgement dialog pre-opened.
          const programmeId = session.selected?.programme?.id;
          const onStage = Boolean(session.selected?.stage?.id);
          if (programmeId && onStage && pathname?.endsWith("/reporting")) {
            router.push(
              `${pathname.replace(/\/reporting$/, "/judgement")}?start=${programmeId}`,
            );
          } else {
            refreshBoard();
          }
        } else toast.error("Failed to submit reporting");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to submit reporting",
        );
      } finally {
        setActiveAction(null);
      }
    });
  };

  const onReopen = () => {
    const sid = session.selected?.reportingSession?.id;
    if (!sid) return;
    setActiveAction("reopen");
    startTransition(async () => {
      try {
        const res = await reopenProgrammeReportingAction(festivalId, sid);
        if (res.success) {
          const message =
            res.data && typeof res.data === "object" && "message" in res.data
              ? (res.data as { message: string }).message
              : "Reporting reopened successfully";
          toast.success(message);
          session.setIsReopenConfirmOpen(false);
          refreshBoard();
        } else {
          toast.error("Failed to reopen reporting");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to reopen reporting",
        );
      } finally {
        setActiveAction(null);
      }
    });
  };

  const onMarkRow = async (row: RosterTableRow, checked: boolean) => {
    const sid = session.selected?.reportingSession?.id;
    if (!sid) return;

    const ids = [row.assignmentId];

    // Optimistic update
    session.setOptimisticReportedBySession((prev) => {
      const next = new Set(prev[sid] || []);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return { ...prev, [sid]: next };
    });

    session.setMarkingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });

    try {
      await markProgrammeParticipantAction(
        festivalId,
        sid,
        row.assignmentId,
        checked,
      );
    } catch (error) {
      toast.error("Failed to update status");
      refreshBoard();
    } finally {
      session.setMarkingIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }
  };

  const onMarkAllPresent = (assignmentIds: string[]) => {
    const sid = session.selected?.reportingSession?.id;
    if (!sid) return;
    setActiveAction("mark");
    startTransition(async () => {
      const res = await markProgrammeAssignmentsBulkAction(
        festivalId,
        sid,
        assignmentIds,
        true,
      );
      if (res.success) {
        triggerConfetti([20, 40], [0.6, 1.0]);
        toast.success("All marked present");
      } else toast.error("Bulk action failed");
      setActiveAction(null);
    });
  };

  return {
    activeAction,
    isPending,
    confettiRef,
    refreshBoard,
    onStart,
    onAutoStart,
    onReset,
    onCompleteCheckout,
    onScratchTile,
    onRevealAllRemaining,
    onClose,
    onReopen,
    onMarkRow,
    onMarkAllPresent,
  };
}

/** Helper used by ReportingWorkspaceHeader to gate buttons on transition state. */
export function isReportingActionInFlight(
  active: ReportingActiveAction,
  ...actions: NonNullable<ReportingActiveAction>[]
): boolean {
  return active != null && actions.includes(active);
}
