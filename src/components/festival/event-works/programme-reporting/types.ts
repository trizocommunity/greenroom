export type ProgrammeReportingAssignmentRow = {
  id: string;
  programmeId: string;
  studentId: string | null;
  studentName: string | null;
  groupId: string | null;
  groupName: string | null;
  teamNumber: number | null;
};

export type ReportingBoardItem = {
  id: string;
  startTime: Date;
  stage: { id: string; name: string } | null;
  programme: {
    id: string;
    name: string;
    type: "INDIVIDUAL" | "GROUP";
    category: { id: string; name: string } | null;
  } | null;
  reportingSession: {
    id: string;
    status: string;
    windowEndsAt: Date | null;
    isLocked: boolean;
    programmeReportedParticipants: Array<{ assignmentId: string }>;
    programmeCodeLetters: Array<{
      code: string;
      programmeCodeLetterRecipients: Array<{ studentId: string }>;
    }>;
  } | null;
};

export type AssignmentWithReported = ProgrammeReportingAssignmentRow & {
  isReported: boolean;
};

/** One roster row per assignment (individual programme or each member of a group team). */
export type RosterTableRow = {
  key: string;
  mode: "individual";
  assignmentId: string;
  studentId: string | null;
  nameColumn: string;
  groupName: string | null;
  teamCell: string | number;
  isReported: boolean;
  reportedBy?: string | null;
};
