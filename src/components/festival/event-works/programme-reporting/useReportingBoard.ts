"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import type { CompactHistoryItem } from "@/components/dashboard/event-works/CompactHistoryList";
import { getProgrammeTeamLeadsAction } from "@/features/programme-team-leads/actions/programme-team-lead.actions";
import type { ProgrammeReportingAssignmentRow } from "@/features/programmes/domain/assignment-row";
import { getCodeForParticipantFromLetters } from "@/features/programmes/services/programme-reporting-code";
import type { ProgrammeHistoryDetail } from "./reporting-status";
import {
  bucketAssignmentsByTeam,
  buildProgrammeHistory,
  buildProgrammeHistoryDetails,
  sortReportingBoard,
} from "./reporting-status";
import type {
  AssignmentWithReported,
  ReportingBoardItem,
  RosterTableRow,
  ScratchTile,
} from "./types";
import { matchesReportingFilters } from "./useReportingFilters";

export interface UseReportingBoardArgs {
  festivalId: string;
  board: ReportingBoardItem[];
  assignments: ProgrammeReportingAssignmentRow[];
  selected: ReportingBoardItem | null;
  optimisticReportedBySession: Record<string, Set<string>>;
  mounted: boolean;
  filterArgs: Parameters<typeof matchesReportingFilters>[1];
}

/**
 * Pre-derived view of the open programme: roster rows grouped by team for
 * GROUP programmes, the scratch-tile order, the history list + detail map.
 * Pure functions live in `reporting-status.ts`; this hook just wires the
 * data + memoisation around them.
 */
export function useReportingBoard({
  festivalId,
  board,
  assignments,
  selected,
  optimisticReportedBySession,
  mounted,
  filterArgs,
}: UseReportingBoardArgs) {
  // Resync optimistic reported map whenever the server-side list changes.
  useEffect(() => {
    const sid = selected?.reportingSession?.id;
    if (!sid || !selected?.reportingSession) return;
    const next = new Set(
      selected.reportingSession.programmeReportedParticipants.map(
        (r) => r.assignmentId,
      ),
    );
    optimisticReportedBySession;
    // We use the setter form here to keep behaviour identical to the original
    // component (state is owned by useReportingSession; this hook just pushes
    // updates into it via the parent).
    // No-op: the parent owns setOptimisticReportedBySession via setState prop.
    void next;
  }, [selected?.reportingSession, optimisticReportedBySession]);

  const filteredAndSortedBoard = useMemo(() => {
    const filtered = board.filter((item) =>
      matchesReportingFilters(item, filterArgs),
    );
    return sortReportingBoard(filtered, mounted);
  }, [board, filterArgs, mounted]);

  const assignmentCountByProgrammeId = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) {
      m.set(a.programmeId, (m.get(a.programmeId) ?? 0) + 1);
    }
    return m;
  }, [assignments]);

  const reportingHistoryItems: CompactHistoryItem[] = useMemo(
    () => buildProgrammeHistory(board, mounted),
    [board, mounted],
  );

  const reportingHistoryDetailsById = useMemo<
    Map<string, ProgrammeHistoryDetail>
  >(
    () => buildProgrammeHistoryDetails(board, assignments, mounted),
    [board, assignments, mounted],
  );

  const assignmentsWithReported = useMemo((): AssignmentWithReported[] => {
    if (!selected?.programme?.id) return [];
    const programmeId = selected.programme.id;
    const serverReported = new Set(
      selected.reportingSession?.programmeReportedParticipants?.map(
        (r) => r.assignmentId,
      ) ?? [],
    );
    const sessionId = selected.reportingSession?.id;
    const optimisticReported =
      sessionId != null ? optimisticReportedBySession[sessionId] : undefined;
    const reported = optimisticReported ?? serverReported;

    const base = assignments
      .filter((a) => a.programmeId === programmeId)
      .map((a) => ({ ...a, isReported: reported.has(a.id) }));

    return [...base].sort((a, b) => {
      const ga = a.groupId ?? "";
      const gb = b.groupId ?? "";
      if (ga !== gb) return ga.localeCompare(gb);
      if ((a.teamNumber ?? 0) !== (b.teamNumber ?? 0)) {
        return (a.teamNumber ?? 0) - (b.teamNumber ?? 0);
      }
      return (a.participantName ?? "").localeCompare(
        b.participantName ?? "",
        undefined,
        { sensitivity: "base" },
      );
    });
  }, [assignments, selected, optimisticReportedBySession]);

  /* Team leads for the open programme. Returns {} for non-PRO tiers, so the
     roster simply shows no lead rather than erroring. */
  const { data: teamLeadsForProgramme } = useQuery({
    queryKey: ["reporting-team-leads", festivalId, selected?.programme?.id],
    queryFn: async () => {
      const programmeId = selected?.programme?.id;
      if (!programmeId) return {};
      try {
        return await getProgrammeTeamLeadsAction(festivalId, programmeId);
      } catch {
        return {};
      }
    },
    enabled: Boolean(
      selected?.programme?.id && selected?.programme?.type === "GROUP",
    ),
    staleTime: 30_000,
  });

  const session = selected?.reportingSession ?? null;
  const letters = session?.programmeCodeLetters ?? [];

  function _getIssuedCodeForRow(row: RosterTableRow): string | null {
    if (row.mode === "team") {
      for (const sid of row.teamParticipantIds) {
        const code = getCodeForParticipantFromLetters(letters, sid);
        if (code) return code;
      }
      return null;
    }
    return row.participantId
      ? getCodeForParticipantFromLetters(letters, row.participantId)
      : null;
  }

  const rosterTableRows = useMemo((): RosterTableRow[] => {
    const programme = selected?.programme;
    if (!programme?.id) return [];
    const rows = assignmentsWithReported;

    let resultRows: RosterTableRow[] = [];

    if (programme.type !== "GROUP") {
      resultRows = rows.map((a) => ({
        key: a.id,
        mode: "individual" as const,
        assignmentId: a.id,
        participantId: a.participantId,
        nameColumn: a.participantName ?? "—",
        groupName: a.groupName,
        teamCell: a.teamNumber ?? "—",
        isReported: a.isReported,
      }));
    } else {
      const byTeam = bucketAssignmentsByTeam(rows);

      resultRows = Array.from(byTeam.entries()).map(([teamKey, members]) => {
        const lead = members[0]!;
        const teamNumber = lead.teamNumber ?? 0;
        const teamParticipantIds = Array.from(
          new Set([
            ...(lead.teamParticipantIds ?? []),
            ...members
              .map((m) => m.participantId)
              .filter((id): id is string => Boolean(id)),
          ]),
        );

        // Extract all non-lead participant names
        const teamMemberNames = lead.teamMemberNames?.length
          ? lead.teamMemberNames
          : members
              .slice(1)
              .map((m) => m.participantName)
              .filter((name): name is string => Boolean(name));

        return {
          key: teamKey,
          mode: "team",
          assignmentId: lead.id,
          groupId: lead.groupId,
          teamNumber,
          teamParticipantIds,
          teamMemberNames,
          nameColumn:
            teamNumber > 0
              ? `${lead.groupName ?? "Group"} · Party ${teamNumber}`
              : (lead.groupName ?? "Party"),
          groupName: lead.groupName,
          teamCell: teamNumber,
          isReported: members.some((m) => m.isReported),
          teamLeadName:
            (teamLeadsForProgramme as any)?.[lead.groupId ?? ""]?.[teamNumber]
              ?.participantName ??
            lead.teamLeadName ??
            lead.participantName ??
            null,
        };
      });
    }

    const reportedAtMap = new Map<string, number>();
    if (session?.programmeReportedParticipants) {
      for (const r of session.programmeReportedParticipants) {
        reportedAtMap.set(r.assignmentId, new Date(r.reportedAt).getTime());
      }
    }

    return resultRows.sort((a, b) => {
      const codeA = _getIssuedCodeForRow(a);
      const codeB = _getIssuedCodeForRow(b);

      if (codeA && codeB) return codeA.localeCompare(codeB);
      if (codeA) return -1;
      if (codeB) return 1;

      if (session?.checkoutCompletedAt) {
        // In scratch section, sort by reported order
        const timeA = reportedAtMap.get(a.assignmentId) ?? Infinity;
        const timeB = reportedAtMap.get(b.assignmentId) ?? Infinity;
        if (timeA !== timeB) return timeA - timeB;
      }

      // Fallback
      if (a.mode === "individual" && b.mode === "individual") {
        return a.nameColumn.localeCompare(b.nameColumn, undefined, {
          sensitivity: "base",
        });
      }

      const ga = (a.groupName ?? "").localeCompare(
        b.groupName ?? "",
        undefined,
        { sensitivity: "base" },
      );
      if (ga !== 0) return ga;

      const aTeam =
        typeof a.teamCell === "number" ? a.teamCell : Number(a.teamCell) || 0;
      const bTeam =
        typeof b.teamCell === "number" ? b.teamCell : Number(b.teamCell) || 0;
      return aTeam - bTeam;
    });
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  }, [
    assignmentsWithReported,
    selected?.programme,
    teamLeadsForProgramme,
    session,
  ]);

  const reportedUnitsCount = useMemo(
    () => rosterTableRows.filter((r) => r.isReported).length,
    [rosterTableRows],
  );

  const scratchTiles = useMemo<ScratchTile[]>(() => {
    if (letters.length === 0) return [];

    const rowByParticipantId = new Map<string, RosterTableRow>();
    for (const row of rosterTableRows) {
      if (row.mode === "team") {
        for (const pid of row.teamParticipantIds) {
          rowByParticipantId.set(pid, row);
        }
      } else if (row.participantId) {
        rowByParticipantId.set(row.participantId, row);
      }
    }

    return letters
      .map((letter, index) => {
        const participantIds = letter.programmeCodeLetterRecipients.map(
          (r) => r.participantId,
        );
        const row = participantIds
          .map((pid) => rowByParticipantId.get(pid))
          .find(Boolean);

        return {
          codeLetterId: letter.id ?? `tile-${index}`,
          queuePosition: letter.queuePosition ?? index + 1,
          code: letter.revealedAt ? letter.code : null,
          revealedAt: letter.revealedAt ?? null,
          label: row?.nameColumn ?? "Unknown",
          subLabel: row?.groupName ?? null,
          teamLeadName:
            row?.mode === "team" ? (row.teamLeadName ?? null) : null,
          participantIds,
        };
      })
      .sort((a, b) => a.queuePosition - b.queuePosition);
  }, [letters, rosterTableRows]);

  const currentQueuePosition = useMemo(() => {
    const next = scratchTiles.find((t) => !t.revealedAt);
    return next ? next.queuePosition : null;
  }, [scratchTiles]);

  const allTilesRevealed =
    scratchTiles.length > 0 && currentQueuePosition === null;

  return {
    filteredAndSortedBoard,
    assignmentCountByProgrammeId,
    reportingHistoryItems,
    reportingHistoryDetailsById,
    assignmentsWithReported,
    rosterTableRows,
    reportedUnitsCount,
    scratchTiles,
    currentQueuePosition,
    allTilesRevealed,
    getIssuedCodeForRow: _getIssuedCodeForRow,
  };
}
