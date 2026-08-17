export type ProgrammeReportingAssignmentRow = {
  id: string;
  programmeId: string;
  participantId: string | null;
  participantName: string | null;
  chestNumber?: string | null;
  groupId: string | null;
  groupName: string | null;
  teamNumber: number | null;
  teamLeadName?: string | null;
  /** GROUP-only: participant ids from programme_assignment_member (XOR-migrated data). */
  teamParticipantIds?: string[];
};
