"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getUiReportingStatus } from "./reporting-status";
import type { ReportingBoardItem } from "./types";
import type { ReportingFiltersState } from "./useReportingFilters";
import type { ReportingSessionState } from "./useReportingSession";

/**
 * URL-driven deep-link handler. Reads `?programmeId` (or `?open` / `?autoStart`)
 * and:
 *  - clears any filters that would hide the target entry,
 *  - selects the entry,
 *  - if `?autoStart` is also present and the session is NOT_STARTED/RESET,
 *    fires the start action via the `onAutoStart` callback.
 * Then strips the URL so subsequent polls don't re-trigger.
 *
 * Renders nothing.
 */
export function ReportingAutoOpen({
  mounted,
  board,
  filters,
  session,
  onAutoStart,
}: {
  mounted: boolean;
  board: ReportingBoardItem[];
  filters: ReportingFiltersState;
  session: ReportingSessionState;
  onAutoStart: (programmeId: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const firedAutoStart = useRef(false);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const programmeParam =
      urlParams.get("programmeId") ||
      urlParams.get("open") ||
      urlParams.get("autoStart");
    if (!programmeParam || board.length === 0) return;

    const targetEntry = board.find(
      (item) =>
        item.programme?.id === programmeParam || item.id === programmeParam,
    );
    if (!targetEntry) {
      router.replace(pathname, { scroll: false });
      return;
    }

    if (
      targetEntry.programme?.category?.id &&
      filters.filterCategoryId !== "ALL" &&
      targetEntry.programme.category.id !== filters.filterCategoryId
    ) {
      filters.setFilterCategoryId("ALL");
    }
    if (
      targetEntry.stage?.id &&
      filters.filterStageId !== "ALL" &&
      targetEntry.stage.id !== filters.filterStageId
    ) {
      filters.setFilterStageId("ALL");
    }
    if (
      targetEntry.programme?.type &&
      filters.filterType !== "ALL" &&
      targetEntry.programme.type !== filters.filterType
    ) {
      filters.setFilterType("ALL");
    }

    if (targetEntry.scheduleEntry) {
      if (filters.filterScheduleState !== "SCHEDULED") {
        filters.setFilterScheduleState("SCHEDULED");
      }
      if (targetEntry.startTime) {
        const d = new Date(targetEntry.startTime);
        const targetKey = d.toDateString();
        const matches = filters.filterDate.some(
          (selected) => selected.toDateString() === targetKey,
        );
        if (!matches) {
          filters.setFilterDate([d]);
        }
      }
    } else if (filters.filterScheduleState !== "UNSCHEDULED") {
      filters.setFilterScheduleState("UNSCHEDULED");
    }

    session.setSelectedEntryId(targetEntry.id);

    const autoStartId = urlParams.get("autoStart");
    if (autoStartId && !firedAutoStart.current) {
      firedAutoStart.current = true;
      const status = getUiReportingStatus(
        targetEntry.reportingSession?.status,
        targetEntry.reportingSession?.windowEndsAt ?? null,
        true,
      );
      if (status === "NOT_STARTED" || status === "RESET") {
        onAutoStart(targetEntry.id);
      }
    }

    router.replace(pathname, { scroll: false });
  }, [
    mounted,
    board,
    filters.filterCategoryId,
    filters.filterStageId,
    filters.filterType,
    filters.filterScheduleState,
    filters.filterDate,
    filters.setFilterCategoryId,
    filters.setFilterStageId,
    filters.setFilterType,
    filters.setFilterScheduleState,
    filters.setFilterDate,
    session.setSelectedEntryId,
    onAutoStart,
    router,
    pathname,
  ]);

  return null;
}
