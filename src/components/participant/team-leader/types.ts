import type {
  CategoryType,
  ProgrammeStatus,
  ProgrammeType,
  StageType,
} from "@/core/types/app-enums";

export type ProgrammeForAssignment = {
  id: string;
  name: string;
  type: ProgrammeType;
  stageType: StageType;
  status: ProgrammeStatus;
  maxTeamsPerGroup: number;
  maxParticipantsPerTeam: number;
  maxParticipantsPerGroup: number;
  category: { id: string; name: string; type: CategoryType | null };
};

export type MyParticipantForAssignment = {
  id: string;
  name: string;
  chestNumber: string | null;
  categoryId: string;
};
