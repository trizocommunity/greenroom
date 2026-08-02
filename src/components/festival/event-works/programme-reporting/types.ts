export type ProgrammeReportingAssignmentRow = {
  id: string;
  programmeId: string;
  participantId: string | null;
  participantName: string | null;
  chestNumber?: string | null;
  groupId: string | null;
  groupName: string | null;
  teamNumber: number | null;
};

export type ReportingBoardItem = {
  id: string;
  startTime: Date | null;
  stage: { id: string; name: string } | null;
  programme: {
    id: string;
    name: string;
    type: "INDIVIDUAL" | "GROUP";
    status?: string;
    category: { id: string; name: string } | null;
  };
  scheduleEntry: {
    id: string;
    startTime: string;
    stageId: string | null;
  } | null;
  reportingSession: {
    id: string;
    status: string;
    /** Present when loaded from DB; used for history sort */
    endedAt?: string | null;
    updatedAt?: string | null;
    windowEndsAt: Date | null;
    isLocked: boolean;
    programmeReportedParticipants: Array<{
      assignmentId: string;
      participantId: string | null;
      groupId: string | null;
      teamNumber: number | null;
      reportedAt: string;
      reportedBy: string | null;
    }>;
    programmeCodeLetters: Array<{
      code: string;
      issuedAt?: string;
      programmeCodeLetterRecipients: Array<{ participantId: string }>;
    }>;
  } | null;
};

export type AssignmentWithReported = ProgrammeReportingAssignmentRow & {
  isReported: boolean;
};

export type RosterTableRow =
  | {
      key: string;
      mode: "individual";
      assignmentId: string;
      participantId: string | null;
      nameColumn: string;
      groupName: string | null;
      teamCell: string | number;
      isReported: boolean;
      reportedBy?: string | null;
    }
  | {
      key: string;
      mode: "team";
      assignmentId: string;
      groupId: string | null;
      teamNumber: number;
      teamParticipantIds: string[];
      /** PRO only; the appointed lead for this team, when there is one. */
      teamLeadName?: string | null;
      nameColumn: string;
      groupName: string | null;
      teamCell: number;
      isReported: boolean;
      reportedBy?: string | null;
    };
