import type { ExportListItem } from "@/features/exports/types/export.types";

/**
 * Pure decision logic for the export-issues banner. Lives outside the
 * component so it can be unit-tested without a DOM. Returns null when
 * nothing is actionable.
 */

export const STUCK_PROCESSING_MS = 10 * 60 * 1000;
export const RECENT_FAILURE_MS = 24 * 60 * 60 * 1000;

export type BannerVariant = "failure" | "stuck" | null;

export interface BannerContent {
  variant: Exclude<BannerVariant, null>;
  title: string;
  description: string;
}

/**
 * Map an `errorMessage` to a user-friendly hint. Recognises the patterns
 * the runner emits when it bails out before reaching the server action.
 */
export function summarizeIssue(errorMessage: string | null): string | null {
  const msg = (errorMessage ?? "").toLowerCase();
  if (!msg) return null;
  if (msg.includes("exceeds the") && msg.includes("vercel hobby")) {
    return "Export is too large for the Vercel Hobby Server Action body limit (4 MB cap on the Hobby plan). Lower Export Quality (PRINT → STANDARD → SCREEN) or split the export into smaller batches by category or team.";
  }
  if (msg.includes("413") && msg.includes("vercel")) {
    return "Vercel Hobby Server Action body limit reached (HTTP 413). Lower Export Quality (PRINT → STANDARD → SCREEN) or split the export into smaller batches by category or team.";
  }
  if (msg.includes("timed out") || msg.includes("aborted")) {
    return "Upload to storage timed out. Try a smaller batch or a faster connection.";
  }
  if (msg.includes("413") || msg.includes("failed to load")) {
    return "Browser upload hit a network limit. The export will retry automatically; if it keeps failing, try a smaller scope.";
  }
  if (msg.includes("unexpected response")) {
    return "Browser received an unexpected response while uploading the export. Refresh and retry.";
  }
  return null;
}

/**
 * Decide whether to show the banner, and what to say. Returns null when
 * everything is healthy.
 */
export function getBannerContent(
  exportsList: ExportListItem[],
  now: number = Date.now(),
): BannerContent | null {
  const stuck = exportsList.filter((e) => {
    if (e.status !== "PROCESSING") return false;
    const queuedMs = Date.parse(e.queuedAt);
    if (Number.isNaN(queuedMs)) return false;
    return now - queuedMs > STUCK_PROCESSING_MS;
  });

  const recentFailures = exportsList.filter((e) => {
    if (e.status !== "FAILED" || !e.errorMessage) return false;
    const queuedMs = Date.parse(e.queuedAt);
    if (Number.isNaN(queuedMs)) return false;
    return now - queuedMs <= RECENT_FAILURE_MS;
  });

  const summaryWithHint = recentFailures
    .map((e) => ({ item: e, hint: summarizeIssue(e.errorMessage) }))
    .find((entry) => entry.hint !== null);

  if (summaryWithHint?.hint) {
    return {
      variant: "failure",
      title: "Export failed",
      description: summaryWithHint.hint,
    };
  }

  if (stuck.length > 0) {
    return {
      variant: "stuck",
      title: `${stuck.length} export${stuck.length === 1 ? "" : "s"} still processing`,
      description:
        "An export has been processing for over 5 minutes. The browser renderer may have stopped — refresh the page or restart the job from a new export.",
    };
  }

  return null;
}
