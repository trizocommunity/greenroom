import type { PosterTemplateType } from "@/features/posters/types/poster-template.types";
import { RESULT_SLOT_CODES } from "@/features/posters/types/poster-template.types";

export function isResultSlotCode(code: string): boolean {
  return (RESULT_SLOT_CODES as readonly string[]).includes(code);
}

export function templateTypeFromCode(code: string): PosterTemplateType | null {
  if (isResultSlotCode(code)) return "RESULT";
  if (code.startsWith("TEAM-")) return "TEAM_POINTS";
  if (code.startsWith("CARD-")) return "CANDIDATE_CARD";
  return null;
}

export function validateTemplateCode(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return "Template code is required";
  if (isResultSlotCode(trimmed)) return null;
  if (/^TEAM-[A-Z0-9][A-Z0-9_-]{0,31}$/i.test(trimmed)) return null;
  if (/^CARD-[A-Z0-9][A-Z0-9_-]{0,31}$/i.test(trimmed)) return null;
  return "Code must be RESULT-A, RESULT-B, TEAM-{suffix}, or CARD-{suffix}";
}

export function defaultCodeForType(type: PosterTemplateType): string {
  switch (type) {
    case "RESULT":
      return "RESULT-A";
    case "TEAM_POINTS":
      return "TEAM-MAIN";
    case "CANDIDATE_CARD":
      return "CARD-DEFAULT";
  }
}
