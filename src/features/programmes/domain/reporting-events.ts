export type ReportingDomainEvent =
  | ReportingStarted
  | ReportingClosed
  | ReportingReset
  | ReportingReopened
  | ReportingUnlockedForScheduleChange
  | ParticipantMarked
  | ParticipantUnmarked
  | SpinCodesAssigned
  | CodeLettersReset;

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

export type SpinCodesAssigned = {
  type: "SPIN_CODES_ASSIGNED";
  festivalId: string;
  reportingSessionId: string;
  programmeId: string;
  programmeType: "INDIVIDUAL" | "GROUP";
  actorName: string;
  codeAssignments: Array<{
    teamNumber: number | null;
    groupId: string | null;
    participantId: string | null;
    code: string;
  }>;
};

export type CodeLettersReset = {
  type: "CODE_LETTERS_RESET";
  festivalId: string;
  reportingSessionId: string;
  programmeId: string;
  actorName: string;
};
