"use client";

import party from "party-js";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "@/lib/toast";
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
} from "@/features/programmes/actions/programme-reporting.actions";
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

export interface UseReportingActionsArgs {
  festivalId: string;
  festivalSlug?: string;
  session: ReportingSessionState;
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
    setActiveAction("complete-checkout");
    startTransition(async () => {
      try {
        const res = await completeCheckoutAction(festivalId, sid);
        if (res.success) {
          toast.success(
            `Checkout complete — ${res.data.tileCount} code letter${
              res.data.tileCount === 1 ? "" : "s"
            } ready to draw.`,
          );
          session.setWizardStep("scratch");
          refreshBoard();
        } else {
          toast.error("Failed to complete checkout");
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to complete checkout",
        );
      } finally {
        setActiveAction(null);
      }
    });
  };

  const onScratchTile = (codeLetterId: string) => {
    const sid = session.selected?.reportingSession?.id;
    if (!sid) return;
    session.setIsRevealing(true);
    startTransition(async () => {
      try {
        const res = await revealScratchCodeAction(
          festivalId,
          sid,
          codeLetterId,
        );
        if (res.success) {
          triggerConfetti([20, 30], [0.6, 1]);
          toast.success(`Code ${res.data.code}`);
          refreshBoard();
        } else {
          toast.error("Failed to reveal code");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to reveal code",
        );
      } finally {
        session.setIsRevealing(false);
      }
    });
  };

  const onRevealAllRemaining = () => {
    const sid = session.selected?.reportingSession?.id;
    if (!sid) return;
    setActiveAction("reveal-all");
    startTransition(async () => {
      try {
        const res = await revealAllRemainingAction(festivalId, sid);
        if (res.success) {
          toast.success(
            `Revealed ${res.data.revealedCount} remaining code letter${
              res.data.revealedCount === 1 ? "" : "s"
            }.`,
          );
          refreshBoard();
        } else {
          toast.error("Failed to reveal remaining codes");
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to reveal remaining codes",
        );
      } finally {
        setActiveAction(null);
      }
    });
  };

  const onClose = () => {
    const sid = session.selected?.reportingSession?.id;
    const programmeType = session.selected?.programme?.type;
    if (!sid) return;
    setActiveAction("close");
    startTransition(async () => {
      try {
        const res = await closeProgrammeReportingAction(festivalId, sid);
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
