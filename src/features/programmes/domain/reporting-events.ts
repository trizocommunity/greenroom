export type ReportingDomainEvent =
  | ReportingStarted
  | ReportingClosed
  | ReportingReset
  | ReportingReopened
  | ReportingUnlockedForScheduleChange
  | ParticipantMarked
  | ParticipantUnmarked
  | CheckoutCompleted;

export type ReportingStarted = {
  type: "REPORTING_STARTED";
  festivalId: string;
  reportingSessionId: string;
  programmeId: string;
  actorName: string;
};

export type ReportingClosed = {
  type: "REPORTING_CLOSED";
  festivalId: string;
  reportingSessionId: string;
  programmeId: string;
  programmeType: "INDIVIDUAL" | "GROUP";
  actorName: string;
  effectiveEndedAt: string;
};

export type ReportingReset = {
  type: "REPORTING_RESET";
  festivalId: string;
  reportingSessionId: string;
  programmeId: string;
  actorName: string;
  programmeType: "INDIVIDUAL" | "GROUP";
};

export type ReportingReopened = {
  type: "REPORTING_REOPENED";
  festivalId: string;
  reportingSessionId: string;
  programmeId: string;
  actorName: string;
  programmeType: "INDIVIDUAL" | "GROUP";
};

export type ReportingUnlockedForScheduleChange = {
  type: "REPORTING_UNLOCKED_FOR_SCHEDULE_CHANGE";
  festivalId: string;
  reportingSessionId: string;
  programmeId: string;
};

export type ParticipantMarked = {
  type: "PARTICIPANT_MARKED";
  festivalId: string;
  reportingSessionId: string;
  programmeId: string;
  assignmentId: string;
  participantIds: string[];
  groupId: string | null;
  teamNumber: number | null;
  programmeType: "INDIVIDUAL" | "GROUP";
  isBulk: boolean;
  actorName: string;
};

export type ParticipantUnmarked = {
  type: "PARTICIPANT_UNMARKED";
  festivalId: string;
  reportingSessionId: string;
  programmeId: string;
  assignmentId: string;
  participantIds: string[];
  groupId: string | null;
  teamNumber: number | null;
  programmeType: "INDIVIDUAL" | "GROUP";
  isBulk: boolean;
  actorName: string;
};

/**
 * Raised when the stage manager finishes checkout (step 1 of the reporting
 * drawer). This is the moment every code letter for the session is generated.
 *
 * Each entry is one scratchable tile — one participant for INDIVIDUAL
 * programmes, one team for GROUP. `code` is already shuffled by the caller, so
 * the letter a unit ends up with is unrelated to when they checked in.
 * `queuePosition` is checkout scan order and drives whose turn it is to
 * scratch; it deliberately does NOT correlate with `code`.
 */
export type CheckoutCompleted = {
  type: "CHECKOUT_COMPLETED";
  festivalId: string;
  reportingSessionId: string;
  programmeId: string;
  programmeType: "INDIVIDUAL" | "GROUP";
  actorName: string;
  candidateCount: number;
  shuffledCodeAssignments: Array<{
    code: string;
    queuePosition: number;
    participantId: string | null;
    groupId: string | null;
    teamNumber: number | null;
  }>;
};
