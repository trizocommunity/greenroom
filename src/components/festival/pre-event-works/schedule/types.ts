import type {
  ConflictParts,
  EnrichedScheduleEntry,
  SchedulableProgramme,
} from "@/features/schedule/actions/schedule.actions";

export type StageOption = {
  id: string;
  name: string;
  description?: string | null;
};

export type ScheduleEntryType = "PROGRAMME" | "SESSION";

export type AddEntryInput = {
  type: ScheduleEntryType;
  programmeId?: string;
  title?: string;
  description?: string;
  speakers?: string;
  sessionType?: string;
  stageId?: string;
  startTime: Date;
  endTime?: Date;
  scheduleDayKey: string;
};

export type EditEntryInput = {
  title?: string | null;
  description?: string | null;
  speakers?: string | null;
  sessionType?: string | null;
  stageId?: string | null;
  startTime?: Date;
  endTime?: Date | null;
  scheduleDayKey: string;
};

export type ClearFilters = { stageId?: string; dateKey?: string };

export type { ConflictParts, EnrichedScheduleEntry, SchedulableProgramme };
