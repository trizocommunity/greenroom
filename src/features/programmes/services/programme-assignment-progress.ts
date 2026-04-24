import type { ProgrammeType } from "@/core/types/app-enums";

export function getExpectedAssignmentsTotal(params: {
  programmeType: ProgrammeType | string;
  groupCount: number;
  maxParticipantsPerGroup?: number | null;
  maxTeamsPerGroup?: number | null;
  maxStudentsPerTeam?: number | null;
}): number {
  const {
    programmeType,
    groupCount,
    maxParticipantsPerGroup,
    maxTeamsPerGroup,
    maxStudentsPerTeam,
  } = params;

  if (groupCount <= 0) return 0;

  if (programmeType === "INDIVIDUAL") {
    return groupCount * (maxParticipantsPerGroup ?? 1);
  }

  return groupCount * (maxTeamsPerGroup ?? 1) * (maxStudentsPerTeam ?? 1);
}

export function getAssignmentProgressLabel(params: {
  assignedCount: number;
  expectedCount: number;
}): string {
  const { assignedCount, expectedCount } = params;
  if (expectedCount <= 0) return `Assigned: ${assignedCount}`;
  if (assignedCount >= expectedCount) return "Fully assigned";
  return `Assigned: ${assignedCount}/${expectedCount}`;
}
