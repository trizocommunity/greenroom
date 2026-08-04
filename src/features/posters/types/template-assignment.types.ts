export type AssignmentKind =
  | "RESULT_RANGE"
  | "CERTIFICATE_TYPE"
  | "BADGE"
  | "TEAM_POINTS";

export type CertificateType =
  | "PARTICIPATION"
  | "FIRST"
  | "SECOND"
  | "THIRD"
  | "COMMON_PRIZE"
  | "GRADE";

export interface TemplateAssignment {
  id: string;
  festivalId: string;
  templateCode: string;
  assignmentKind: AssignmentKind;
  fromResultNo: number | null;
  toResultNo: number | null;
  certificateType: string | null;
  createdAt: string;
  updatedAt: string;
}
