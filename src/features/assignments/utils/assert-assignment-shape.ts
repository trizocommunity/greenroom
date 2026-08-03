import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { ProgrammeType } from "@/core/types/app-enums";

export interface AssignmentShape {
  participantId?: string | null;
  groupId?: string | null;
  teamNumber?: number | null;
}

export function assertAssignmentShape(
  programmeType: ProgrammeType | string | null | undefined,
  row: AssignmentShape,
): void {
  if (programmeType === "INDIVIDUAL") {
    if (row.groupId) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INDIVIDUAL_REQUIRES_PARTICIPANT);
    }
    if (!row.participantId) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INDIVIDUAL_REQUIRES_PARTICIPANT);
    }
    return;
  }

  if (programmeType === "GROUP") {
    if (row.participantId) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_GROUP_REQUIRES_GROUP);
    }
    if (!row.groupId) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_GROUP_REQUIRES_GROUP);
    }
    const tn = row.teamNumber ?? 1;
    if (!Number.isInteger(tn) || tn < 1) {
      throw new AppError(ERROR_MESSAGES.ASSIGNMENT_GROUP_REQUIRES_TEAM_NUMBER);
    }
    return;
  }

  throw new AppError(ERROR_MESSAGES.ASSIGNMENT_INVALID_SHAPE);
}

export function isIndividualAssignment(row: AssignmentShape): boolean {
  return Boolean(row.participantId) && !row.groupId;
}

export function isGroupAssignment(row: AssignmentShape): boolean {
  return !row.participantId && Boolean(row.groupId);
}
