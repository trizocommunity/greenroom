import type { PosterTemplateType } from "@/features/posters/types/poster-template.types";
import { RESULT_SLOT_CODES } from "@/features/posters/types/poster-template.types";

export function isResultSlotCode(code: string): boolean {
  return (RESULT_SLOT_CODES as readonly string[]).includes(code);
}

export function templateTypeFromCode(code: string): PosterTemplateType | null {
  if (isResultSlotCode(code)) return "RESULT";
  if (code.startsWith("CARD-")) return "CANDIDATE_CARD";
  if (code.startsWith("CERT-")) return "CERTIFICATE";
  if (code.startsWith("TEAM-")) return "TEAM_POINTS";
  return null;
}

const SUFFIX_RE = /^[A-Z0-9][A-Z0-9_-]{0,31}$/i;

export function validateTemplateCode(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return "Template code is required";
  if (isResultSlotCode(trimmed)) return null;
  if (trimmed.startsWith("CARD-") && SUFFIX_RE.test(trimmed.slice(5)))
    return null;
  if (trimmed.startsWith("CERT-") && SUFFIX_RE.test(trimmed.slice(5)))
    return null;
  if (trimmed.startsWith("TEAM-") && SUFFIX_RE.test(trimmed.slice(5)))
    return null;
  return "Code must be RESULT-A, RESULT-B, CARD-{suffix}, CERT-{suffix}, or TEAM-{suffix}";
}

export function defaultCodeForType(type: PosterTemplateType): string {
  switch (type) {
    case "RESULT":
      return "RESULT-A";
    case "CANDIDATE_CARD":
      return "CARD-DEFAULT";
    case "CERTIFICATE":
      return "CERT-DEFAULT";
    case "TEAM_POINTS":
      return "TEAM-MAIN";
  }
}

export function suggestNextTemplateCode(
  type: PosterTemplateType,
  existingCodes: string[] = [],
): string {
  const upperExisting = new Set(existingCodes.map((c) => c.toUpperCase()));
  switch (type) {
    case "RESULT": {
      if (!upperExisting.has("RESULT-A")) return "RESULT-A";
      if (!upperExisting.has("RESULT-B")) return "RESULT-B";
      return "RESULT-A";
    }
    case "CANDIDATE_CARD": {
      if (!upperExisting.has("CARD-DEFAULT")) return "CARD-DEFAULT";
      for (let i = 1; i <= 99; i++) {
        const candidate = `CARD-${String(i).padStart(2, "0")}`;
        if (!upperExisting.has(candidate)) return candidate;
      }
      return `CARD-${Date.now().toString().slice(-4)}`;
    }
    case "CERTIFICATE": {
      if (!upperExisting.has("CERT-DEFAULT")) return "CERT-DEFAULT";
      for (let i = 1; i <= 99; i++) {
        const candidate = `CERT-${String(i).padStart(2, "0")}`;
        if (!upperExisting.has(candidate)) return candidate;
      }
      return `CERT-${Date.now().toString().slice(-4)}`;
    }
    case "TEAM_POINTS": {
      if (!upperExisting.has("TEAM-MAIN")) return "TEAM-MAIN";
      for (let i = 1; i <= 99; i++) {
        const candidate = `TEAM-${String(i).padStart(2, "0")}`;
        if (!upperExisting.has(candidate)) return candidate;
      }
      return `TEAM-${Date.now().toString().slice(-4)}`;
    }
  }
}
