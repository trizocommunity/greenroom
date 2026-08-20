import type { ProgrammeReportingAssignmentRow } from "@/features/programmes/domain/assignment-row";

export type { ProgrammeReportingAssignmentRow };

export type ReportingBoardItem = {
  id: string;
  startTime: Date | null;
  stage: { id: string; name: string } | null;
  programme: {
    id: string;
    name: string;
    type: "INDIVIDUAL" | "GROUP";
    status?: string;
    durationMode: "SEQUENTIAL" | "PARALLEL";
    timePerUnitMinutes: number;
    parallelDurationMinutes: number | null;
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
    startedAt?: Date | null;
    /** Present when loaded from DB; used for history sort */
    endedAt?: string | null;
    updatedAt?: string | null;
    windowEndsAt: Date | null;
    isLocked: boolean;
    /** Set when checkout closed; gates step 2 of the drawer. */
    checkoutCompletedAt?: string | null;
    programmeReportedParticipants: Array<{
      assignmentId: string;
      participantId: string | null;
      groupId: string | null;
      teamNumber: number | null;
      reportedAt: string;
      reportedBy: string | null;
    }>;
    programmeCodeLetters: Array<{
      id?: string;
      code: string;
      issuedAt?: string;
      /** Checkout scan order — drives whose turn it is to scratch. */
      queuePosition?: number | null;
      /** null while the tile is still unscratched. */
      revealedAt?: string | null;
      revealedBy?: string | null;
      programmeCodeLetterRecipients: Array<{ participantId: string }>;
    }>;
  } | null;
};

/** One tile in the scratch grid. `code` is withheld until revealed. */
export type ScratchTile = {
  codeLetterId: string;
  queuePosition: number;
  /** Present only once the tile has been scratched. */
  code: string | null;
  revealedAt: string | null;
  label: string;
  subLabel: string | null;
  /** GROUP-only: the appointed lead for this team, when there is one. */
  teamLeadName?: string | null;
  participantIds: string[];
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
      teamMemberNames: string[];
      nameColumn: string;
      groupName: string | null;
      teamCell: number;
      isReported: boolean;
      reportedBy?: string | null;
    };
