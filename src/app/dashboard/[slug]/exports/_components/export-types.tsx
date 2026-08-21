import {
  Award,
  BadgeCheck,
  FileSpreadsheet,
  Gavel,
  type LucideIcon,
  Phone,
  Trophy,
  Users,
  Calendar,
} from "lucide-react";
import type { ExportConfig } from "@/features/exports/schemas/export-config.schema";

export type ExportTypeId = ExportConfig["type"];

export interface ExportTypeMeta {
  id: ExportTypeId;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Generators land incrementally; only implemented types can be queued. */
  implemented: boolean;
  formats: ("PDF" | "CSV")[];
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
    description: "Participant ID cards with chest numbers, team and category.",
    icon: BadgeCheck,
    implemented: true,
    formats: ["PDF"],
  },
  {
    id: "CERTIFICATE",
    title: "Certificate",
    description: "Participation and placement certificates.",
    icon: Award,
    implemented: true,
    formats: ["PDF"],
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
