import { teamKey } from "./team-key";

/**
 * Inputs for `reportedEntriesFromReportedRows` and
 * `reportedEntriesFromScratchTiles`. Kept structural so callers can pass
 * either DB rows or pre-joined view models.
 */
export type ReportedEntriesInput = {
  /** Whether the programme is GROUP (teams) or INDIVIDUAL (per-participant). */
  programmeType: "INDIVIDUAL" | "GROUP";
  /** Reported-participant rows; multiple rows per team in GROUP programmes. */
  reportedRows: ReadonlyArray<{
    assignmentId: string;
    groupId: string | null;
    teamNumber: number | null;
  }>;
  /** Lookup of the assignment each reported row belongs to (for name/code). */
  assignments: ReadonlyArray<{
    id: string;
    participantId: string | null;
    participantName: string | null;
    teamLeadName?: string | null | undefined;
    teamParticipantIds?: readonly string[];
  }>;
  /** Lookup of scratch codes by participant id (recipients from code letters). */
  codesByParticipantId: ReadonlyMap<string, string>;
};

export type ReportedEntry = {
  key: string;
  name: string;
  code: string;
  /** GROUP-only: the appointed lead for this team, when there is one. */
  teamLeadName: string | null;
};

/**
 * Build the deduped "Reported Participants" roster.
 *
 * In INDIVIDUAL programmes, each reported row corresponds to a single
 * participant — keyed by assignmentId.
 * In GROUP programmes, multiple reported rows can belong to the same team
 * (e.g. multiple members of one team scratched the queue). We collapse them
 * to one entry per (groupId, teamNumber) and surface the team lead.
 *
 * Sort order is case-insensitive by name; consumers may re-sort if they
 * need a different order.
 */
export function reportedEntriesFromReportedRows(
  input: ReportedEntriesInput,
): ReportedEntry[] {
  const { programmeType, reportedRows, assignments, codesByParticipantId } =
    input;
  const isGroup = programmeType === "GROUP";

  const assignmentsById = new Map(assignments.map((a) => [a.id, a]));
  const deduped = new Map<string, ReportedEntry>();

  for (const r of reportedRows) {
    const assignment = assignmentsById.get(r.assignmentId);
    let key = r.assignmentId;
    let name = assignment?.participantName || "Unknown";
    let firstParticipantId = assignment?.participantId ?? null;
    let teamLeadName: string | null = null;

    if (isGroup) {
      const partialKey = teamKey.partial({
        groupId: r.groupId,
        teamNumber: r.teamNumber,
      });
      const teamLabel =
        r.teamNumber && r.teamNumber > 0 ? `Party ${r.teamNumber}` : "Party";
      teamLeadName = assignment?.teamLeadName ?? null;
      name = teamLeadName ? `${teamLeadName} & ${teamLabel}` : teamLabel;
      firstParticipantId =
        assignment?.teamParticipantIds?.[0] || firstParticipantId;
      key = partialKey;
    }

    if (deduped.has(key)) continue;
    const code = firstParticipantId
      ? codesByParticipantId.get(firstParticipantId) || "—"
      : "—";
    deduped.set(key, { key, name, code, teamLeadName });
  }

  return Array.from(deduped.values());
}

export type ReportedEntriesFromTilesInput = {
  tiles: ReadonlyArray<{
    codeLetterId: string;
    label: string;
    /** GROUP-only: the appointed lead for this team, when there is one. */
    teamLeadName?: string | null;
    code: string | null;
    revealedAt: string | null;
  }>;
};

/**
 * Build the deduped roster from the scratch grid's already-deduped tiles.
 * Tiles are keyed by codeLetterId and already grouped per reporting unit
 * (participant for INDIVIDUAL, team for GROUP), so we just project the
 * tile → entry shape.
 */
export function reportedEntriesFromScratchTiles(
  input: ReportedEntriesFromTilesInput,
): ReportedEntry[] {
  return input.tiles.map((tile) => ({
    key: tile.codeLetterId,
    name: tile.label,
    code: tile.revealedAt && tile.code ? tile.code : "—",
    teamLeadName: tile.teamLeadName ?? null,
  }));
}