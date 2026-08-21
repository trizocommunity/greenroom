import { format } from "date-fns";
import type { ExportConfig } from "@/features/exports/schemas/export-config.schema";
import type { ExportFormat } from "@/features/exports/types/export.types";

/**
 * Build a meaningful download filename for an export. Pattern:
 *   {slug}-{type}[-{variant}]-{YYYY-MM-DD}.{ext}
 *
 * Examples:
 *   suffamehfil-schedule-2026-08-17.pdf
 *   suffamehfil-schedule-2days-2026-08-14.pdf
 *   suffamehfil-call-list-team-wise-2026-08-14.pdf
 *   zororaev13-results-programme-wise.pdf
 *   ahlussuffa-badges.pdf
 *
 * Falls back to a generic `{slug}-{type}.{ext}` when no extra context is
 * available (typical for template exports).
 */
export function buildExportFileName(params: {
  slug: string;
  type: ExportConfig["type"];
  format: ExportFormat;
  /** Optional variant/label suffix per export type (e.g. "team-wise"). */
  variant?: string;
  /** Optional day key (yyyy-MM-dd) when the export is scoped to a day. */
  dayKey?: string | null;
  /** Optional explicit completion timestamp override. */
  now?: Date;
}): string {
  const ext = params.format.toLowerCase();
  const slug = cleanSlug(params.slug) || "export";
  const typeSlug = typeToSlug(params.type);
  const parts: string[] = [slug, typeSlug];
  if (params.variant) parts.push(cleanSlug(params.variant));
  parts.push(stampFor(params.dayKey, params.now));
  return `${parts.join("-")}.${ext}`;
}

function typeToSlug(type: ExportConfig["type"]): string {
  switch (type) {
    case "CALL_LIST":
      return "call-list";
    case "RESULTS":
      return "results";
    case "TEAM_RESULT":
      return "team-result";
    case "JUDGE_LIST":
      return "judge-list";
    case "VALUATION_SHEET":
      return "valuation-sheet";
    case "BADGE":
      return "badges";
    case "CERTIFICATE":
      return "certificates";
    case "SCHEDULE":
      return "schedule";
    default:
      return "export";
  }
}

function cleanSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function stampFor(
  dayKey: string | null | undefined,
  now: Date | undefined,
): string {
  if (dayKey && /^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return dayKey;
  if (now) return format(now, "yyyy-MM-dd");
  return format(new Date(), "yyyy-MM-dd");
}