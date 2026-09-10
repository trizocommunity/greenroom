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
 * Map an `errorMessage` to a short, user-friendly hint. Recognises the
 * patterns the runner emits when it bails out before reaching the server
 * action. Returns the hint, or null when the message doesn't match any
 * known pattern (the caller can fall back to `errorMessage` directly).
 */
export function summarizeIssue(errorMessage: string | null): string | null {
  const msg = (errorMessage ?? "").toLowerCase();
  if (!msg) return null;
  if (msg.includes("exceeds the") && msg.includes("vercel hobby")) {
    return "Export too large. Lower quality or split into smaller batches.";
  }
  if (msg.includes("413") && msg.includes("vercel")) {
    return "Upload rejected (HTTP 413). Lower quality or split into smaller batches.";
  }
  if (msg.includes("timed out") || msg.includes("aborted")) {
    return "Upload timed out. Try again.";
  }
  if (msg.includes("413") || msg.includes("failed to load")) {
    return "Browser couldn't upload. Will retry automatically.";
  }
  if (msg.includes("unexpected response")) {
    return "Unexpected response. Refresh and retry.";
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
      title: `${stuck.length} export${stuck.length === 1 ? "" : "s"} stuck`,
      description: "Processing for over 5 minutes. Refresh or restart the job.",
    };
  }

  return null;
}
