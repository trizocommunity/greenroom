import { AppEmptyState, StatusPill } from "@/components/app/AppSection";
import { ProgrammeStatusBadge } from "@/components/festival/ProgrammeStatusBadge";
import { ReportingEndsInCountdown } from "@/components/programme/ReportingEndsInCountdown";
import type { ProgrammeStatus } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";
import {
  getCodeForParticipantFromLetters,
  mapSessionCodeLettersForLookup,
} from "@/features/programmes/services/programme-reporting-code";

export type ParticipantProgrammeCardItem = {
  programmeId: string;
  name: string;
  categoryName: string | null;
  status: ProgrammeStatus;
  programmeType: string;
};

export type ParticipantProgrammeReportingSession = {
  status: string;
  windowEndsAt?: string | null;
  programmeReportedParticipants: Array<{ assignmentId: string }>;
  programmeCodeLetters: Array<{
    code: string;
    programmeCodeLetterRecipients: Array<{ participantId: string }>;
  }>;
};

function isSessionTimedOut(
  session: ParticipantProgrammeReportingSession | undefined,
): boolean {
  if (!session) return false;
  return Boolean(
    session.status === "IN_PROGRESS" &&
      session.windowEndsAt &&
      new Date(session.windowEndsAt).getTime() <= Date.now(),
  );
}

/**
 * A tint on the row's left edge rather than a coloured card. Uses theme
 * tokens — the previous emerald/amber/blue literals were invisible against
 * the dark theme's surfaces.
 */
function rowAccentClass(
  latest: ParticipantProgrammeReportingSession | undefined,
): string {
  if (!latest) return "border-l-transparent";
  if (isSessionTimedOut(latest) || latest.status === "RESET") {
    return "border-l-warning bg-warning/[0.04]";
  }
  if (latest.status === "IN_PROGRESS") {
    return "border-l-success bg-success/[0.04]";
  }
  if (latest.status === "CLOSED") {
    return "border-l-info bg-info/[0.04]";
  }
  return "border-l-transparent";
}

export function ParticipantAssignedProgrammeCards({
  programmes,
  latestReportingByProgrammeId,
  latestClosedReportingByProgrammeId,
  assignmentIdByProgrammeId,
  participantId,
  emptyMessage = "No assigned programmes yet.",
}: {
  programmes: ParticipantProgrammeCardItem[];
  latestReportingByProgrammeId: Map<
    string,
    ParticipantProgrammeReportingSession
  >;
  latestClosedReportingByProgrammeId: Map<
    string,
    ParticipantProgrammeReportingSession
  >;
  assignmentIdByProgrammeId: Map<string, string>;
  participantId: string;
  emptyMessage?: string;
}) {
  if (programmes.length === 0) {
    return <AppEmptyState title={emptyMessage} />;
  }

  return (
    <ul className="border-y border-border">
      {programmes.map((p) => {
        const latestSess = latestReportingByProgrammeId.get(p.programmeId);
        const closedSess =
          latestClosedReportingByProgrammeId.get(p.programmeId) ??
          (latestSess?.status === "CLOSED" ? latestSess : undefined);

        const isLive =
          latestSess?.status === "IN_PROGRESS" &&
          !isSessionTimedOut(latestSess);
        const isTimedOut = Boolean(latestSess && isSessionTimedOut(latestSess));

        const myAssignmentId = assignmentIdByProgrammeId.get(p.programmeId);
        const iWasReportedOnClosed =
          Boolean(closedSess) &&
          Boolean(myAssignmentId) &&
          Boolean(
            closedSess?.programmeReportedParticipants.some(
              (r) => r.assignmentId === myAssignmentId,
            ),
          );

        const closedCode = closedSess
          ? getCodeForParticipantFromLetters(
              mapSessionCodeLettersForLookup(
                closedSess.programmeCodeLetters ?? [],
              ),
              participantId,
            )
          : null;

        // At most one line of guidance per row — whichever is most actionable.
        const note = isLive
          ? "Report to the stage manager when called."
          : isTimedOut
            ? "Reporting time ended. Wait for the stage manager to restart it."
            : closedSess && !closedCode && iWasReportedOnClosed
              ? "You were reported present; no code letter is on file for this session."
              : closedSess && !closedCode && !iWasReportedOnClosed
                ? "You were not marked present when reporting ended."
                : null;

        return (
          <li
            key={p.programmeId}
            className={cn(
              "border-b border-l-2 border-border px-4 py-4 last:border-b-0",
              rowAccentClass(latestSess),
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium text-heading">
                  {p.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {p.categoryName ?? "Uncategorised"}
                  {p.programmeType === "GROUP" ? " · Team" : ""}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {isLive && (
                  <>
                    <StatusPill tone="live" pulse>
                      Live reporting
                    </StatusPill>
                    {latestSess?.windowEndsAt && (
                      <ReportingEndsInCountdown
                        endsAt={latestSess.windowEndsAt}
                      />
                    )}
                  </>
                )}
                {isTimedOut && (
                  <StatusPill tone="warning">Reporting ended</StatusPill>
                )}
                {latestSess?.status === "CLOSED" && (
                  <StatusPill tone="muted">Reporting closed</StatusPill>
                )}
                {closedSess && latestSess?.status !== "CLOSED" && (
                  <StatusPill tone="muted">Code issued</StatusPill>
                )}
                {latestSess?.status === "RESET" && (
                  <StatusPill tone="warning">Reporting reset</StatusPill>
                )}
                <ProgrammeStatusBadge status={p.status} />
              </div>
            </div>

            {closedCode && (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                {p.programmeType === "GROUP"
                  ? "Your team's code letter"
                  : "Your code letter"}
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-sm font-semibold text-heading">
                  {closedCode}
                </span>
              </p>
            )}

            {note && (
              <p className="mt-2 text-xs text-muted-foreground">{note}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
