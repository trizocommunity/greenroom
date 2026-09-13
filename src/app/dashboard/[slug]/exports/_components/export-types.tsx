import {
  Award,
  BadgeCheck,
  Calendar,
  FileSpreadsheet,
  Gavel,
  type LucideIcon,
  Phone,
  Trophy,
  Users,
} from "lucide-react";
import type { ExportConfig } from "@/features/exports/schemas/export-config.schema";
import type { ExportFormat } from "@/features/exports/types/export.types";

export type ExportTypeId = ExportConfig["type"];

export interface ExportTypeMeta {
  id: ExportTypeId;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Generators land incrementally; only implemented types can be queued. */
  implemented: boolean;
  /**
   * Output formats offered at the export footer for this type. Template
   * exports (BADGE / CERTIFICATE) expose PDF / AI / BOTH so the user can
   * pick the printable PDF, the same PDF under a `.ai` extension (`.ai`
   * is a PDF wrapper; Illustrator opens it as a multi-artboard PDF), or
   * a single zip with both files.
   */
  formats: ("PDF" | "CSV" | "AI" | "BOTH")[];
}

export const EXPORT_TYPES: ExportTypeMeta[] = [
  {
    id: "SCHEDULE",
    title: "Schedule",
    description: "Festival schedule grouped by day and stage.",
    icon: Calendar,
    implemented: true,
    formats: ["PDF"],
  },
  {
    id: "VALUATION_SHEET",
    title: "Valuation Sheet",
    description: "Scoring sheets for judges and evaluators.",
    icon: FileSpreadsheet,
    implemented: true,
    formats: ["PDF", "CSV"],
  },
  {
    id: "CALL_LIST",
    title: "Call List",
    description: "Stage call lists for event coordinators.",
    icon: Phone,
    implemented: true,
    formats: ["PDF", "CSV"],
  },
  {
    id: "RESULTS",
    title: "Results",
    description: "Result sheets with standings, marks and grades.",
    icon: Trophy,
    implemented: true,
    formats: ["PDF", "CSV"],
  },
  {
    id: "TEAM_RESULT",
    title: "Team Result",
    description: "Team-wise points table and standings.",
    icon: Users,
    implemented: true,
    formats: ["CSV"],
  },
  {
    id: "BADGE",
    title: "Badge",
    description:
      "Participant ID cards with chest numbers, team and category. Pick the format at the export footer (PDF, AI, or both in one zip).",
    icon: BadgeCheck,
    implemented: true,
    formats: ["PDF", "AI", "BOTH"],
  },
  {
    id: "CERTIFICATE",
    title: "Certificate",
    description:
      "Participation and placement certificates. Pick the format at the export footer (PDF, AI, or both in one zip).",
    icon: Award,
    implemented: true,
    formats: ["PDF", "AI", "BOTH"],
  },
  {
    id: "JUDGE_LIST",
    title: "Judge List",
    description: "Assignments and details for judges.",
    icon: Gavel,
    implemented: true,
    formats: ["PDF", "CSV"],
  },
];

export function getExportTypeMeta(id: ExportTypeId): ExportTypeMeta {
  return EXPORT_TYPES.find((t) => t.id === id) ?? EXPORT_TYPES[0];
}

/**
 * Derive the user-visible format label from the file name. The `format`
 * column in the DB is locked at queue time ("PDF" for badges/certs), but
 * the export footer can switch the actual file to `.zip`, `.ai`, or
 * `.pdf` at finalize time. Read the extension so the row reflects what's
 * on disk, not what was queued.
 */
export function displayFormat(item: {
  format: ExportFormat;
  fileName: string | null;
}): "PDF" | "CSV" | "AI" | "ZIP" {
  if (item.fileName?.toLowerCase().endsWith(".zip")) return "ZIP";
  if (item.fileName?.toLowerCase().endsWith(".ai")) return "AI";
  if (item.fileName?.toLowerCase().endsWith(".csv")) return "CSV";
  return item.format;
}
