import { ProgrammeStatusBadge } from "@/components/festival/ProgrammeStatusBadge";
import { ReportingEndsInCountdown } from "@/components/programme/ReportingEndsInCountdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProgrammeStatus } from "@/core/types/app-enums";
import {
  getCodeForStudentFromLetters,
  mapSessionCodeLettersForLookup,
} from "@/features/programmes/services/programme-reporting-code";

export type StudentProgrammeCardItem = {
  programmeId: string;
  name: string;
  categoryName: string | null;
  status: ProgrammeStatus;
  programmeType: string;
};

export type StudentProgrammeReportingSession = {
  status: string;
  windowEndsAt?: string | null;
  programmeReportedParticipants: Array<{ assignmentId: string }>;
  programmeCodeLetters: Array<{
    code: string;
    programmeCodeLetterRecipients: Array<{ studentId: string }>;
  }>;
};

function isSessionTimedOut(
  session: StudentProgrammeReportingSession | undefined,
): boolean {
  if (!session) return false;
  return Boolean(
    session.status === "IN_PROGRESS" &&
      session.windowEndsAt &&
      new Date(session.windowEndsAt).getTime() <= Date.now(),
  );
}

function cardBorderClass(
  latest: StudentProgrammeReportingSession | undefined,
): string {
  if (!latest) return "";
  if (isSessionTimedOut(latest)) {
    return "border-amber-500/40 bg-amber-500/10";
  }
  if (latest.status === "IN_PROGRESS") {
    return "border-emerald-500/40 bg-emerald-500/5";
  }
  if (latest.status === "CLOSED") {
    return "border-blue-500/35 bg-blue-500/5";
  }
  if (latest.status === "RESET") {
    return "border-amber-500/40 bg-amber-500/10";
  }
  return "";
}

export function StudentAssignedProgrammeCards({
  programmes,
  latestReportingByProgrammeId,
  latestClosedReportingByProgrammeId,
  assignmentIdByProgrammeId,
  studentId,
  emptyMessage = "No assigned programmes yet.",
}: {
  programmes: StudentProgrammeCardItem[];
  latestReportingByProgrammeId: Map<string, StudentProgrammeReportingSession>;
  latestClosedReportingByProgrammeId: Map<
    string,
    StudentProgrammeReportingSession
  >;
  assignmentIdByProgrammeId: Map<string, string>;
  studentId: string;
  emptyMessage?: string;
}) {
  if (programmes.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {programmes.map((p) => {
        const latestSess = latestReportingByProgrammeId.get(p.programmeId);
        const closedSess =
          latestClosedReportingByProgrammeId.get(p.programmeId) ??
          (latestSess?.status === "CLOSED" ? latestSess : undefined);

        const myAssignmentId = assignmentIdByProgrammeId.get(p.programmeId);
        const iWasReportedOnClosed =
          Boolean(closedSess) &&
          Boolean(myAssignmentId) &&
          Boolean(
            closedSess!.programmeReportedParticipants.some(
              (r) => r.assignmentId === myAssignmentId,
            ),
          );

        const closedCode = closedSess
          ? getCodeForStudentFromLetters(
              mapSessionCodeLettersForLookup(
                closedSess.programmeCodeLetters ?? [],
              ),
              studentId,
            )
          : null;

        return (
          <Card key={p.programmeId} className={cardBorderClass(latestSess)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="truncate">{p.name}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {latestSess?.status === "IN_PROGRESS" &&
                  !isSessionTimedOut(latestSess) ? (
                    <>
                      <Badge className="bg-emerald-600 text-white">
                        Live reporting
                      </Badge>
                      {latestSess.windowEndsAt ? (
                        <ReportingEndsInCountdown
                          endsAt={latestSess.windowEndsAt}
                        />
                      ) : null}
                    </>
                  ) : null}
                  {latestSess && isSessionTimedOut(latestSess) ? (
                    <Badge className="bg-amber-600 text-white">
                      Reporting ended
                    </Badge>
                  ) : null}
                  {latestSess?.status === "CLOSED" ? (
                    <Badge className="bg-blue-600 text-white">
                      Reporting ended
                    </Badge>
                  ) : null}
                  {closedSess && latestSess?.status !== "CLOSED" ? (
                    <Badge className="bg-blue-600/90 text-white">
                      Code issued
                    </Badge>
                  ) : null}
                  {latestSess?.status === "RESET" ? (
                    <Badge className="bg-amber-600 text-white">
                      Reporting closed
                    </Badge>
                  ) : null}
                  <ProgrammeStatusBadge status={p.status} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground space-y-2">
              <div>
                Category:{" "}
                <span className="text-foreground">{p.categoryName ?? "—"}</span>
              </div>
              {closedCode ? (
                <div className="text-foreground font-mono text-sm">
                  {p.programmeType === "GROUP"
                    ? "Your team’s code letter:"
                    : "Your code letter:"}{" "}
                  <span className="rounded border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 font-semibold">
                    {closedCode}
                  </span>
                </div>
              ) : null}
              {closedSess && !closedCode && iWasReportedOnClosed ? (
                <p className="text-xs text-muted-foreground">
                  You were reported present; code letter is not on file for this
                  session.
                </p>
              ) : null}
              {closedSess && !closedCode && !iWasReportedOnClosed ? (
                <p className="text-xs text-muted-foreground">
                  You were not marked present when reporting ended.
                </p>
              ) : null}
              {latestSess?.status === "IN_PROGRESS" &&
              !isSessionTimedOut(latestSess) ? (
                <p className="text-xs text-muted-foreground">
                  Report to the stage manager when called.
                </p>
              ) : null}
              {latestSess && isSessionTimedOut(latestSess) ? (
                <p className="text-xs text-muted-foreground">
                  Reporting time ended. Wait for the stage manager to restart or
                  proceed with current reported participants.
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
