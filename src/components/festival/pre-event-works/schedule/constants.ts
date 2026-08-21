import { format } from "date-fns";

export const SESSION_TYPE_LABELS: Record<string, string> = {
  GENERAL: "General",
  CEREMONY: "Ceremony",
  TALK: "Talk",
  CONCERT: "Concert",
};

export const SESSION_TYPE_OPTIONS = [
  "GENERAL",
  "CEREMONY",
  "TALK",
  "CONCERT",
] as const;

export function getEntryLabel(entry: {
  type: string;
  programme?: { name?: string } | null;
  title?: string | null;
}): string {
  if (entry.type === "PROGRAMME" && entry.programme)
    return entry.programme.name ?? "";
  if (entry.type === "SESSION") return entry.title || "—";
  return "—";
}

export function getDateKey(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

export function safeFormat(
  d: Date,
  pattern: string,
  fallback: string = "—",
): string {
  if (Number.isNaN(d.getTime())) return fallback;
  return format(d, pattern);
}
