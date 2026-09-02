"use client";

import { useEffect, useState } from "react";
import type { ProgrammeReportingAssignmentRow } from "@/features/programmes/domain/assignment-row";
import { LargeTimerDrawer } from "./LargeTimerDrawer";
import { ReportingAutoOpen } from "./ReportingAutoOpen";
import { ReportingFilterSheet } from "./ReportingFilterSheet";
import { ReportingHeader } from "./ReportingHeader";
import { ReportingHistoryDrawer } from "./ReportingHistoryDrawer";
import { ReportingPollingRefresh } from "./ReportingPollingRefresh";
import { ReportingQueue } from "./ReportingQueue";
import { ReportingWorkspace } from "./ReportingWorkspace";
import { getUiReportingStatus } from "./reporting-status";
import type { ReportingBoardItem } from "./types";
import { useReportingActions } from "./useReportingActions";
import { useReportingBoard } from "./useReportingBoard";
import {
  matchesReportingFilters,
  useReportingFilters,
} from "./useReportingFilters";
import { useReportingSession } from "./useReportingSession";

/**
 * Thin wiring component. Holds the four custom hooks (filters, session,
 * actions, board derivations), the two effect-only components (polling
 * refresh, URL auto-open), and renders the focused presentational children.
 */
export function ProgrammeReportingClient({
  festivalId,
  board,
  assignments,
  festivalStages,
  initialStageId,
  hideStageFilter,
}: {
  festivalId: string;
  board: ReportingBoardItem[];
  assignments: ProgrammeReportingAssignmentRow[];
  /** All festival stages (filter dropdown); board alone only lists stages that appear on slots. */
  festivalStages: Array<{ id: string; name: string }>;
  /** Pre-selects the stage filter (e.g. from the stage manager's banner selector). */
  initialStageId?: string | null;
  /** Hides the in-page stage filter — used when the banner selector already covers it. */
  hideStageFilter?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const filters = useReportingFilters({
    board,
    festivalStages,
    initialStageId,
  });
  const session = useReportingSession({ board });
  const actions = useReportingActions({ festivalId, session });

  const derived = useReportingBoard({
    festivalId,
    board,
    assignments,
    selected: session.selected,
    optimisticReportedBySession: session.optimisticReportedBySession,
    mounted,
    filterArgs: {
      filterStatus: filters.filterStatus,
      filterCategoryId: filters.filterCategoryId,
      filterStageId: filters.filterStageId,
      filterType: filters.filterType,
      filterScheduleState: filters.filterScheduleState,
      filterDate: filters.filterDate,
      searchQuery: filters.searchQuery,
      mounted,
    },
  });

  // If the currently-selected entry falls out of the filtered view (e.g. the
  // user tightened filters), drop the selection so the workspace closes.
  useEffect(() => {
    if (
      session.selectedEntryId &&
      !derived.filteredAndSortedBoard.some(
        (e) => e.id === session.selectedEntryId,
      )
    ) {
      session.setSelectedEntryId(null);
    }
  }, [
    derived.filteredAndSortedBoard,
    session.selectedEntryId,
    session.setSelectedEntryId,
  ]);

  // Resync the optimistic reported map whenever the server-side list changes.
  useEffect(() => {
    const sid = session.selected?.reportingSession?.id;
    if (!sid || !session.selected?.reportingSession) return;
    const next = new Set(
      session.selected.reportingSession.programmeReportedParticipants.map(
        (r) => r.assignmentId,
      ),
    );
    session.setOptimisticReportedBySession((prev) => ({
      ...prev,
      [sid]: next,
    }));
  }, [
    session.selected?.reportingSession,
    session.setOptimisticReportedBySession,
  ]);

  const onSelect = (id: string) => {
    const item = derived.filteredAndSortedBoard.find((b) => b.id === id);
    const uiStatus = getUiReportingStatus(
      item?.reportingSession?.status,
      item?.reportingSession?.windowEndsAt ?? null,
      mounted,
    );

    if (["CLOSED", "TIMED_OUT"].includes(uiStatus)) {
      session.setTimerDrawerEntryId(id);
      return;
    }
    if (id === session.selectedEntryId) return;
    session.setIsEntrySwitching(true);
    session.setSelectedEntryId(id);
    window.setTimeout(() => session.setIsEntrySwitching(false), 300);
  };

  const timerItem = session.timerDrawerEntryId
    ? (derived.filteredAndSortedBoard.find(
        (b) => b.id === session.timerDrawerEntryId,
      ) ?? null)
    : null;

  const timerHistoryDetail = session.timerDrawerEntryId
    ? (derived.reportingHistoryDetailsById.get(session.timerDrawerEntryId) ??
      null)
    : null;

  const historyDetail = session.historyDetailOpenId
    ? (derived.reportingHistoryDetailsById.get(session.historyDetailOpenId) ??
      null)
    : null;

  return (
    <div className="space-y-4 sm:space-y-5">
      <ReportingPollingRefresh />

      <div className="space-y-3">
        <ReportingHeader
          filters={filters}
          onOpenFilterSheet={() => filters.setIsFilterOpen(true)}
        />

        <ReportingQueue
          items={derived.filteredAndSortedBoard}
          selectedId={session.selectedEntryId}
          pageIndex={filters.pageIndex}
          pageSize={filters.pageSize}
          assignmentCountByProgrammeId={derived.assignmentCountByProgrammeId}
          mounted={mounted}
          hasActiveFilterOrSearch={
            filters.searchQuery.trim().length > 0 ||
            filters.activeFilterCount > 0
          }
          onSelect={onSelect}
          onPageChange={filters.setPageIndex}
        />
      </div>

      <ReportingWorkspace
        festivalId={festivalId}
        selected={session.selected}
        derived={{
          assignmentsWithReported: derived.assignmentsWithReported,
          rosterTableRows: derived.rosterTableRows,
          reportedUnitsCount: derived.reportedUnitsCount,
          allTilesRevealed: derived.allTilesRevealed,
          scratchTiles: derived.scratchTiles,
          currentQueuePosition: derived.currentQueuePosition,
          getIssuedCodeForRow: derived.getIssuedCodeForRow,
        }}
        actions={actions}
        session={session}
        refreshBoard={actions.refreshBoard}
      />

      <ReportingFilterSheet
        filters={filters}
        hideStageFilter={Boolean(hideStageFilter)}
      />

      <ReportingHistoryDrawer
        historyDetail={historyDetail}
        onClose={() => session.setHistoryDetailOpenId(null)}
      />

      <ReportingAutoOpen
        mounted={mounted}
        board={board}
        filters={filters}
        session={session}
        onAutoStart={actions.onAutoStart}
      />

      <LargeTimerDrawer
        festivalId={festivalId}
        item={timerItem}
        assignments={assignments}
        historyDetail={timerHistoryDetail}
        isOpen={!!session.timerDrawerEntryId}
        onOpenChange={(open) => {
          if (!open) session.setTimerDrawerEntryId(null);
        }}
        onOpenWorkspace={() => {
          const id = session.timerDrawerEntryId;
          session.setTimerDrawerEntryId(null);
          if (id) {
            session.setIsEntrySwitching(true);
            session.setSelectedEntryId(id);
            session.setIsReopenConfirmOpen(true);
            window.setTimeout(() => session.setIsEntrySwitching(false), 300);
          }
        }}
      />
    </div>
  );
}

/** Re-exported so the page or tests can grab the pure predicate if needed. */
export { matchesReportingFilters, getUiReportingStatus };
