import { z } from "zod";

// ─── Shared option enums ─────────────────────────────────────────────────────

export const genderFilter = z.enum(["ALL", "MALE", "FEMALE"]);
export const pageLayout = z.enum(["SINGLE_PER_PAGE", "CONTINUOUS_GRID"]);
export const scheduleState = z.enum(["ALL", "SCHEDULED", "UNSCHEDULED"]);
export const listOrientation = z.enum(["PROGRAMME_WISE", "TEAM_WISE"]);
export const exportQuality = z.enum(["SCREEN", "STANDARD", "PRINT"]);
export const printLayout = z.enum(["ONE_PER_PAGE", "MULTIPLE_PER_PAGE"]);
export const pageSize = z.enum(["A3", "A4", "A5", "LETTER", "LEGAL"]);
export const badgePageSize = z.enum(["A3", "A4"]);
export const certificatePageSize = z.enum(["A3", "A4"]);
export const pageOrientation = z.enum(["PORTRAIT", "LANDSCAPE"]);
export const exportFit = z.enum(["FIT", "FILL"]);
/**
 * Multi-per-page grid preset. "AUTO" picks a layout from page orientation
 * (portrait → 2×2 = 4 per page; landscape → 4×2 = 8 per page). Anything else
 * uses the explicit "COLSxROWS" pair as cols × rows on the page.
 */
export const multiGrid = z.enum([
  "AUTO",
  "1x2",
  "1x3",
  "1x4",
  "1x5",
  "1x6",
  "2x1",
  "2x2",
  "2x3",
  "2x4",
  "2x5",
  "2x6",
  "3x1",
  "3x2",
  "3x3",
  "3x4",
  "3x5",
  "3x6",
  "4x1",
  "4x2",
  "4x3",
  "4x4",
  "4x5",
  "4x6",
  "5x1",
  "5x2",
  "5x3",
  "5x4",
  "6x1",
  "6x2",
  "6x3",
  "6x4",
]);
export const judgeGrouping = z.enum(["JUDGE_WISE", "PROGRAMME_WISE"]);

export const programmeTypeFilter = z.enum(["ALL", "INDIVIDUAL", "GROUP"]);
export const callListSortBy = z.enum(["CHEST_NUMBER", "NAME", "TEAM"]);

const idList = z.array(z.string()).default([]);

// ─── Per-type config variants ────────────────────────────────────────────────

export const callListConfig = z.object({
  type: z.literal("CALL_LIST"),
  onlyWithParticipants: z.boolean().default(true),
  listType: listOrientation.default("PROGRAMME_WISE"),
  programmeType: programmeTypeFilter.default("ALL"),
  gender: genderFilter.default("ALL"),
  sortBy: callListSortBy.default("CHEST_NUMBER"),
  includeChestNumber: z.boolean().default(true),
  includeCategory: z.boolean().default(true),
  includeTeam: z.boolean().default(true),
  includeStage: z.boolean().default(false),
  includeDob: z.boolean().default(false),
  includePhone: z.boolean().default(false),
  includeSignatureLine: z.boolean().default(false),
  includeRemarks: z.boolean().default(false),
  categoryIds: idList,
  programmeIds: idList,
  teamIds: idList,
  scheduleState: scheduleState.default("ALL"),
  stageIds: idList,
  pageLayout: pageLayout.default("CONTINUOUS_GRID"),
});

const resultsFields = {
  gender: genderFilter.default("ALL"),
  onlyPublished: z.boolean().default(true),
  includeCodeLetter: z.boolean().default(false),
  includeGrades: z.boolean().default(true),
  includePoints: z.boolean().default(true),
  includeJudgeReports: z.boolean().default(false),
  includePhone: z.boolean().default(false),
  includeDob: z.boolean().default(false),
  startResultNumber: z.number().int().positive().default(1),
  endResultNumber: z.number().int().positive().nullable().default(null),
  categoryIds: idList,
  programmeIds: idList,
  pageLayout: pageLayout.default("CONTINUOUS_GRID"),
};

export const resultsConfig = z.object({
  type: z.literal("RESULTS"),
  listType: listOrientation.default("PROGRAMME_WISE"),
  ...resultsFields,
});

export const teamResultConfig = z.object({
  type: z.literal("TEAM_RESULT"),
  gender: genderFilter.default("ALL"),
  onlyPublished: z.boolean().default(true),
  includeAwardPoints: z.boolean().default(true),
  teamIds: idList,
  categoryIds: idList,
  programmeIds: idList,
});

export const judgeListConfig = z.object({
  type: z.literal("JUDGE_LIST"),
  grouping: judgeGrouping.default("JUDGE_WISE"),
  layout: pageLayout.default("SINGLE_PER_PAGE"),
  includeDescription: z.boolean().default(true),
  categoryIds: idList,
  programmeIds: idList,
  stageIds: idList,
});

export const valuationSheetConfig = z.object({
  type: z.literal("VALUATION_SHEET"),
  gender: genderFilter.default("ALL"),
  includeCodeLetters: z.boolean().default(true),
  includeGroup: z.boolean().default(false),
  categoryIds: idList,
  programmeIds: idList,
  pageLayout: pageLayout.default("SINGLE_PER_PAGE"),
});

export const badgeConfig = z.object({
  type: z.literal("BADGE"),
  templateId: z.string().min(1),
  gender: genderFilter.default("ALL"),
  quality: exportQuality.default("STANDARD"),
  printLayout: printLayout.default("MULTIPLE_PER_PAGE"),
  pageSize: badgePageSize
    .default("A4")
    .catch("A4" as const),
  pageOrientation: pageOrientation.default("PORTRAIT"),
  /**
   * Multi-per-page grid. Only meaningful when `printLayout === "MULTIPLE_PER_PAGE"`.
   * "AUTO" = orientation-driven default (4 in portrait, 8 in landscape).
   * Other values are explicit "COLSxROWS" — e.g. "2x4" means 2 columns × 4 rows.
   */
  multiGrid: multiGrid.default("AUTO"),
  fit: exportFit.default("FIT"),
  marginMm: z.number().min(0).max(20).default(3),
  gutterMm: z.number().min(0).max(20).default(3),
  bleedMm: z.number().min(0).max(6).default(0),
  drawCropMarks: z.boolean().default(false),
  onlyWithChestNumber: z.boolean().default(true),
  categoryIds: idList,
  teamIds: idList,
});

export const certificateConfig = z.object({
  type: z.literal("CERTIFICATE"),
  templateId: z.string().min(1),
  quality: exportQuality.default("STANDARD"),
  printLayout: printLayout.default("ONE_PER_PAGE"),
  pageSize: certificatePageSize
    .default("A4")
    .catch("A4" as const),
  pageOrientation: pageOrientation.default("PORTRAIT"),
  fit: exportFit.default("FIT"),
  marginMm: z.number().min(0).max(20).default(3),
  gutterMm: z.number().min(0).max(20).default(3),
  bleedMm: z.number().min(0).max(6).default(0),
  drawCropMarks: z.boolean().default(false),
  certificateTypes: z
    .array(
      z.enum([
        "PARTICIPATION",
        "FIRST",
        "SECOND",
        "THIRD",
        "COMMON_PRIZE",
        "GRADE",
      ]),
    )
    .default(["PARTICIPATION"]),
  categoryIds: idList,
  programmeIds: idList,
});

export const timeDisplayMode = z.enum(["START_AND_END", "START_ONLY"]);

export const scheduleConfig = z.object({
  type: z.literal("SCHEDULE"),
  days: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default([]),
  timeDisplay: timeDisplayMode.default("START_AND_END"),
  includeStage: z.boolean().default(true),
  includeDescription: z.boolean().default(true),
  includeSpeakers: z.boolean().default(false),
  includeEntryType: z.boolean().default(false),
  timezoneOffset: z.number().optional(),
});

export const exportConfigSchema = z.discriminatedUnion("type", [
  callListConfig,
  resultsConfig,
  teamResultConfig,
  judgeListConfig,
  valuationSheetConfig,
  badgeConfig,
  certificateConfig,
  scheduleConfig,
]);

export type ExportConfig = z.infer<typeof exportConfigSchema>;
export type CallListConfig = z.infer<typeof callListConfig>;
export type ResultsConfig = z.infer<typeof resultsConfig>;
export type TeamResultConfig = z.infer<typeof teamResultConfig>;
export type JudgeListConfig = z.infer<typeof judgeListConfig>;
export type ValuationSheetConfig = z.infer<typeof valuationSheetConfig>;
export type BadgeConfig = z.infer<typeof badgeConfig>;
export type CertificateConfig = z.infer<typeof certificateConfig>;
export type ScheduleConfig = z.infer<typeof scheduleConfig>;

export type PageLayout = z.infer<typeof pageLayout>;
export type GenderFilter = z.infer<typeof genderFilter>;
export type TimeDisplayMode = z.infer<typeof timeDisplayMode>;
export type PageSize = z.infer<typeof pageSize>;
export type PageOrientation = z.infer<typeof pageOrientation>;

export const TEMPLATE_EXPORT_TYPES = ["BADGE", "CERTIFICATE"] as const;

export function isTemplateExport(type: ExportConfig["type"]): boolean {
  return (TEMPLATE_EXPORT_TYPES as readonly string[]).includes(type);
}
