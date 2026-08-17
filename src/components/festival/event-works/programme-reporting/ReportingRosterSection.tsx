"use client";

import { Users2 } from "lucide-react";
import { useState } from "react";
import { QrScanner } from "./QrScanner";
import { ReportingQuickAddSection } from "./ReportingQuickAddSection";
import { ReportingRosterTable } from "./ReportingRosterTable";
import type { ReportingBoardItem, RosterTableRow } from "./types";
import type { ReportingActions } from "./useReportingActions";
import type { ReportingSessionState } from "./useReportingSession";

export interface ReportingRosterSectionDerived {
  rosterTableRows: RosterTableRow[];
  getIssuedCodeForRow: (row: RosterTableRow) => string | null;
}

/**
 * Two roster shapes: during checkout, the roster is hidden inside a manual
 * check-in collapse and paired with a manual-entry scanner. After checkout
 * closes, the roster expands to fill the workspace and is read-only (with
 * the issued code visible per row).
 */
export function ReportingRosterSection({
  festivalId,
  selected,
  session,
  derived,
  actions,
}: {
  festivalId: string;
  selected: ReportingBoardItem;
  session: ReportingSessionState;
  derived: ReportingRosterSectionDerived;
  actions: ReportingActions;
}) {
  const programmeType = selected.programme!.type;
  const sid = selected.reportingSession?.id ?? null;
  const [manualRosterOpen, setManualRosterOpen] = useState(false);

  if (session.isInProgress && session.wizardStep === "checkout") {
    return (
      <ReportingQuickAddSection
        open={manualRosterOpen}
        onOpenChange={setManualRosterOpen}
        title="Manual check-in"
        subtitle="Chest # · photo · roster"
      >
        <div className="space-y-3">
          {sid ? (
            <QrScanner
              variant="embedded"
              mode="manual"
              hideResults
              festivalId={festivalId}
              reportingSessionId={sid}
              programmeName={selected.programme?.name || "Programme"}
              onScanSuccess={(result) => {
                session.pushScanEntry(result, true);
                actions.refreshBoard();
              }}
              onScanError={(result) => {
                session.pushScanEntry(result, false);
              }}
            />
          ) : null}
          <div className="h-px bg-border/70" aria-hidden />
          <ReportingRosterTable
            rows={derived.rosterTableRows}
            isInProgress={session.isInProgress}
            isClosed={session.isClosed}
            onMark={actions.onMarkRow}
            markingIds={session.markingIds}
            getIssuedCodeForRow={derived.getIssuedCodeForRow}
            programmeType={programmeType}
          />
        </div>
      </ReportingQuickAddSection>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-tight">
        <Users2 className="h-4 w-4 text-muted-foreground" />
        Roster
      </h3>
      <ReportingRosterTable
        rows={derived.rosterTableRows}
        isInProgress={session.isInProgress}
        isClosed={session.isClosed}
        onMark={actions.onMarkRow}
        markingIds={session.markingIds}
        getIssuedCodeForRow={derived.getIssuedCodeForRow}
        programmeType={programmeType}
        disabled={session.wizardStep === "scratch"}
      />
    </div>
  );
}
