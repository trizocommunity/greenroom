"use client";

import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ExportListItem } from "@/features/exports/types/export.types";

const STUCK_PROCESSING_MS = 5 * 60 * 1000;
const RECENT_FAILURE_MS = 24 * 60 * 60 * 1000;

interface ExportIssuesBannerProps {
  exports: ExportListItem[];
}

function summarizeIssue(item: ExportListItem): string | null {
  const msg = (item.errorMessage ?? "").toLowerCase();
  if (msg.includes("exceeds the") && msg.includes("mb limit")) {
    return "Export was larger than the browser upload limit. Try lowering Export Quality or splitting into smaller batches.";
  }
  if (
    msg.includes("network") ||
    msg.includes("failed to load") ||
    msg.includes("413")
  ) {
    return "Browser upload hit a network limit. The export will retry automatically; if it keeps failing, try a smaller scope.";
  }
  if (msg.includes("unexpected response")) {
    return "Browser received an unexpected response while uploading the export. Refresh and retry.";
  }
  return null;
}

export function ExportIssuesBanner({ exports }: ExportIssuesBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const now = Date.now();

  const stuck = exports.filter((e) => {
    if (e.status !== "PROCESSING") return false;
    const queuedMs = Date.parse(e.queuedAt);
    if (Number.isNaN(queuedMs)) return false;
    return now - queuedMs > STUCK_PROCESSING_MS;
  });

  const recentFailures = exports.filter((e) => {
    if (e.status !== "FAILED" || !e.errorMessage) return false;
    const queuedMs = Date.parse(e.queuedAt);
    if (Number.isNaN(queuedMs)) return false;
    return now - queuedMs <= RECENT_FAILURE_MS;
  });

  const summaryWithHint = recentFailures
    .map((e) => ({ item: e, hint: summarizeIssue(e) }))
    .find((entry) => entry.hint !== null);

  const hasIssue = stuck.length > 0 || summaryWithHint !== undefined;
  if (!hasIssue) return null;

  return (
    <Alert
      variant={summaryWithHint ? "destructive" : "default"}
      className="flex items-start justify-between gap-4"
    >
      <div className="flex gap-3">
        {summaryWithHint ? (
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
        ) : stuck.length > 0 ? (
          <Loader2 className="h-5 w-5 mt-0.5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Info className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
        )}
        <div className="space-y-1">
          <AlertTitle>
            {summaryWithHint
              ? "Export failed"
              : `${stuck.length} export${stuck.length === 1 ? "" : "s"} still processing`}
          </AlertTitle>
          <AlertDescription>
            {summaryWithHint?.hint}
            {!summaryWithHint && stuck.length > 0 && (
              <>
                A export has been processing for over 5 minutes. The browser
                renderer may have stopped — refresh the page or restart the job
                from a new export.
              </>
            )}
          </AlertDescription>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        Dismiss
      </Button>
    </Alert>
  );
}
