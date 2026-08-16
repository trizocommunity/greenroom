import type { ProgrammeJudgementStatus } from "@/core/types/app-enums";

export type Judge = { id: string; name: string; description?: string | null };

export type ReportedEntry = {
  label: string;
  groupName: string | null;
  categoryName: string | null;
  codeLetter: string | null;
  teamNumber: number | null;
};

export type ReportingDetails = {
  stageName: string | null;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  reportedCount: number;
  reportedEntries: ReportedEntry[];
  assignedCount: number;
  absentCount: number;
  stageId: string | null;
  submittedAt?: Date | string | null;
};

export type Programme = {
  id: string;
  name: string;
  status: string;
  programmeType: "INDIVIDUAL" | "GROUP";
  programmeCategory?: string | null;
  durationMode?: "PARALLEL" | "PER_UNIT" | null;
  timePerUnitMinutes?: number | null;
  parallelDurationMinutes?: number | null;
  reportingDetails?: ReportingDetails | null;
};

export type ActiveConfig = {
  id: string;
  programmeId: string;
  programmeName: string;
  programmeStatus: string;
  programmeCategory?: string | null;
  scoreLimit: number;
  judgingMode: "SINGLE" | "GROUP";
  judges: Array<{ id: string; name: string }>;
  startedAt: string | null;
  startedBy: string | null;
  judgementStatus: ProgrammeJudgementStatus;
};

export type JudgedProgrammeCard = {
  configId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  programmeId: string;
  programmeName: string;
  programmeStatus: string;
  programmeCategory?: string | null;
  scoreLimit: number;
  judgingMode: "SINGLE" | "GROUP";
  requiredCodeLetters: number;
  totalJudgements: number;
  isJudgementComplete: boolean;
  judgementStatus: ProgrammeJudgementStatus;
  completionSummary: string;
  judgeProgress: Array<{
    judgeId: string;
    judgeName: string;
    scoredCount: number;
    requiredCount: number;
    isComplete: boolean;
  }>;
  pendingJudgeNames: string[];
  judges: Array<{
    id: string;
    name: string;
    firstScoredAt: string | null;
    submittedAt: string | null;
  }>;
  codeLetterRows: Array<{
    codeLetterId: string;
    code: string;
    average: number;
    grade: string | null;
    awardPoints: number | null;
    isAbsent: boolean;
    judgeScores: Record<string, number>;
  }>;
};

/** Snapshot shape for React Query; server actions infer narrower DB enums that clash with `initialData`. */
export type JudgementDashboardQueryData = {
  judgeProgrammes: Programme[];
  rejudgeProgrammes: Programme[];
  judges: Judge[];
  activeConfigs: ActiveConfig[];
  judgedProgrammes: JudgedProgrammeCard[];
  judgesByStageId: Record<string, string[]>;
};

export type ParticipantsViewState = {
  programmeName: string;
  programmeCategory: string | null;
  programmeType: "INDIVIDUAL" | "GROUP";
  details: ReportingDetails;
};

export type ReportedParticipantsViewState = ParticipantsViewState;

export const POLICY_SCORE_LIMIT = 100;
export const PAGE_SIZE = 12;

export function judgementStatusLabel(status: ProgrammeJudgementStatus): string {
  switch (status) {
    case "COMPLETED":
      return "Completed";
    case "AWAITING_JUDGES":
      return "Awaiting judges";
    case "SCORING_IN_PROGRESS":
      return "Scoring in progress";
    case "LIVE":
      return "Live";
    default:
      return "Not started";
  }
}
