import type { z } from "zod";
import type {
  ExportConfig,
  genderFilter,
} from "@/features/exports/schemas/export-config.schema";

const EXPORT_TYPE_LABELS: Record<ExportConfig["type"], string> = {
  CALL_LIST: "Call List",
  RESULTS: "Results",
  TEAM_RESULT: "Team Result",
  JUDGE_LIST: "Judge List",
  VALUATION_SHEET: "Valuation Sheet",
  BADGE: "Badge",
  CERTIFICATE: "Certificate",
};

export function exportTypeLabel(type: ExportConfig["type"]): string {
  return EXPORT_TYPE_LABELS[type];
}

function genderLabel(g: z.infer<typeof genderFilter>): string {
  return g === "ALL" ? "All genders" : g === "MALE" ? "Male" : "Female";
}

function orientation(v: "PROGRAMME_WISE" | "TEAM_WISE"): string {
  return v === "TEAM_WISE" ? "Team-wise" : "Competition-wise";
}

export interface ExportSummary {
  summary: string;
  badges: string[];
}

/**
 * Human-readable one-line summary plus a set of filter "chips" for the exports
 * table. The table shows the first chip inline and collapses the rest into
 * a "+N" badge.
 */
export function buildExportSummary(config: ExportConfig): ExportSummary {
  const badges: string[] = [];
  let summary = exportTypeLabel(config.type);

  switch (config.type) {
    case "CALL_LIST":
      summary = `${orientation(config.listType)} call list`;
      if (config.programmeType && config.programmeType !== "ALL")
        badges.push(`Type: ${config.programmeType.toLowerCase()}`);
      badges.push(`Gender: ${genderLabel(config.gender)}`);
      if (config.onlyWithParticipants) badges.push("With participants only");
      if (config.scheduleState !== "ALL")
        badges.push(`Schedule: ${config.scheduleState.toLowerCase()}`);
      if (config.teamIds?.length)
        badges.push(`${config.teamIds.length} groups`);
      if (config.categoryIds.length)
        badges.push(`${config.categoryIds.length} categories`);
      if (config.programmeIds.length)
        badges.push(`${config.programmeIds.length} competitions`);
      if (config.includeStage) badges.push("Stage");
      if (config.includeDob) badges.push("DOB");
      if (config.includePhone) badges.push("Phone");
      if (config.includeSignatureLine) badges.push("Signature");
      if (config.includeRemarks) badges.push("Remarks");
      break;
    case "RESULTS":
      summary = `${orientation(config.listType)} results`;
      badges.push(`Gender: ${genderLabel(config.gender)}`);
      if (config.onlyPublished) badges.push("Published only");
      if (config.includeGrades) badges.push("Grades");
      if (config.includePoints) badges.push("Points");
      if (config.includeCodeLetter) badges.push("Code letter");
      if (config.categoryIds.length)
        badges.push(`${config.categoryIds.length} categories`);
      break;
    case "TEAM_RESULT":
      summary = "Team-wise results";
      badges.push(`Gender: ${genderLabel(config.gender)}`);
      if (config.onlyPublished) badges.push("Published only");
      if (config.teamIds.length) badges.push(`${config.teamIds.length} teams`);
      break;
    case "JUDGE_LIST":
      summary =
        config.grouping === "JUDGE_WISE"
          ? "Judge-wise judge list"
          : "Competition-wise judge list";
      if (config.includeDescription) badges.push("With details");
      if (config.stageIds.length)
        badges.push(`${config.stageIds.length} stages`);
      break;
    case "VALUATION_SHEET":
      summary = "Valuation sheets";
      badges.push(`Gender: ${genderLabel(config.gender)}`);
      if (config.includeCodeLetters) badges.push("Code letters");
      if (config.programmeIds.length)
        badges.push(`${config.programmeIds.length} competitions`);
      break;
    case "BADGE":
      summary = "Participant badges";
      badges.push(`Gender: ${genderLabel(config.gender)}`);
      badges.push(`Quality: ${config.quality.toLowerCase()}`);
      if (config.teamIds.length) badges.push(`${config.teamIds.length} teams`);
      break;
    case "CERTIFICATE":
      summary = "Certificates";
      badges.push(`Quality: ${config.quality.toLowerCase()}`);
      badges.push(`${config.certificateTypes.length} types`);
      break;
  }

  return { summary, badges };
}
