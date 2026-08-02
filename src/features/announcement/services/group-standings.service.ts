export type TeamStandingInput = {
  name: string;
  points: number;
  rank?: number;
  isGroup?: boolean;
};

type LeaderboardResultRow = {
  id: string;
  isPublished: boolean;
  points?: number;
  awardPoints?: number | null;
  programme?: { id: string; type: "INDIVIDUAL" | "GROUP" } | null;
  programmeAssignment?: {
    group?: { id: string; name: string } | null;
    participant?: { fullName?: string | null; name?: string | null } | null;
    teamNumber?: number | null;
  } | null;
};

function resultPointsOf(r: LeaderboardResultRow) {
  return r.awardPoints ?? r.points ?? 0;
}

/**
 * Live team standings from published results.
 */
export function computeAnnouncedTeamStandings(
  results: LeaderboardResultRow[],
  groupFilterId?: string,
): TeamStandingInput[] {
  const standings: Record<
    string,
    { name: string; points: number; isGroup: boolean }
  > = {};
  const countedGroupProgrammeTeams = new Set<string>();

  for (const r of results) {
    if (!r.isPublished) continue;

    const assignment = r.programmeAssignment;
    const group = assignment?.group;
    if (groupFilterId && group?.id !== groupFilterId) continue;

    let teamName: string | null = null;
    let isGroup = false;
    if (group?.name) {
      teamName = group.name;
      isGroup = true;
    } else if (assignment?.participant) {
      teamName =
        assignment.participant.fullName || assignment.participant.name || null;
    }
    if (!teamName) continue;

    if (r.programme?.type === "GROUP") {
      const teamKey = `${r.programme.id}:${group?.id ?? "na"}:${assignment?.teamNumber ?? 1}`;
      if (countedGroupProgrammeTeams.has(teamKey)) continue;
      countedGroupProgrammeTeams.add(teamKey);
    }

    if (!standings[teamName]) {
      standings[teamName] = { name: teamName, points: 0, isGroup };
    }
    standings[teamName].points += resultPointsOf(r);
  }

  return Object.values(standings)
    .sort((a, b) => b.points - a.points)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}
