"use client";

import { QrScanner } from "./QrScanner";
import { type ScanEntry, ScanResponseFooter } from "./ScanResponseFooter";
import type { ReportingBoardItem } from "./types";
import type { ReportingSessionState } from "./useReportingSession";

/**
 * The check-in phase body: a camera scanner at the top + a live response
 * footer showing the most recent scan results. The roster lives in a
 * separate section below the fold.
 */
export function ReportingCheckoutStep({
  festivalId,
  selected,
  session,
  recentScans,
  refreshBoard,
}: {
  festivalId: string;
  selected: ReportingBoardItem;
  session: ReportingSessionState;
  recentScans: ScanEntry[];
  refreshBoard: () => void;
}) {
  const sid = selected.reportingSession?.id;
  if (!sid) return null;

  return (
    <div className="space-y-3">
      <QrScanner
        variant="embedded"
        mode="camera"
        autoStart={false}
        hideResults
        festivalId={festivalId}
        reportingSessionId={sid}
        programmeName={selected.programme?.name || "Programme"}
        onScanSuccess={(result) => {
          session.pushScanEntry(result, true);
          refreshBoard();
        }}
        onScanError={(result) => {
          session.pushScanEntry(result, false);
        }}
      />
      <ScanResponseFooter entries={recentScans} />
    </div>
  );
}
