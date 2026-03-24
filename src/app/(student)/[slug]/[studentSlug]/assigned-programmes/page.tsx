import type { ProgrammeStatus, ProgrammeType } from "@prisma/client";
import { notFound } from "next/navigation";
import { ProgrammeStatusBadge } from "@/components/festival/ProgrammeStatusBadge";
import { ReportingEndsInCountdown } from "@/components/programme/ReportingEndsInCountdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { getCodeForStudentFromLetters } from "@/lib/programme-reporting-code";
import { getProgrammeStatusPriorityRank } from "@/lib/programme-status-priority";
import { findFestivalBySlug } from "@/server/models/festival.model";
import {
  findStudentByFestivalAndId,
  findStudentByFestivalAndProfileSlug,
} from "@/server/models/student.model";

const RESERVED_SLUGS = new Set([
  "results",
  "gallery",
  "news",
  "programmes",
  "sessions",
  "about",
]);

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

export default async function AssignedProgrammesPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;
  if (RESERVED_SLUGS.has(studentSlug)) notFound();

  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const canViewProfile = FeatureService.isFeatureEnabled(
    getTierForFeatureCheck(festival.tier),
    "publicStudentProfile",
  );
  if (!canViewProfile) notFound();

  const student = looksLikeUuid(studentSlug)
    ? await findStudentByFestivalAndId(festival.id, studentSlug)
    : await findStudentByFestivalAndProfileSlug(festival.id, studentSlug);
  if (!student) notFound();

  if (student.isTeamLeader) notFound();

  const programmeById = new Map<
    string,
    {
      programmeId: string;
      name: string;
      categoryName: string | null;
      status: ProgrammeStatus;
      programmeType: ProgrammeType;
    }
  >();

  for (const a of student.assignments ?? []) {
    const p = a.programme;
    if (!p?.id) continue;
    if (!p.status) continue;
    if (programmeById.has(p.id)) continue;
    programmeById.set(p.id, {
      programmeId: p.id,
      name: p.name,
      categoryName: p.category?.name ?? null,
      status: p.status,
      programmeType: p.type,
    });
  }

  const programmes = Array.from(programmeById.values()).sort((a, b) => {
    return (
      getProgrammeStatusPriorityRank(a.status) -
      getProgrammeStatusPriorityRank(b.status)
    );
  });

  const assignedProgrammes = programmes;

  const assignmentIdByProgrammeId = new Map<string, string>();
  for (const a of student.assignments ?? []) {
    const pid = a.programme?.id;
    if (pid) assignmentIdByProgrammeId.set(pid, a.id);
  }

  const programmeIds = assignedProgrammes.map((p) => p.programmeId);
  const reportingSessions =
    programmeIds.length > 0
      ? await prisma.programmeReportingSession.findMany({
          where: { programmeId: { in: programmeIds } },
          orderBy: { updatedAt: "desc" },
          include: {
            reportedParticipants: { select: { assignmentId: true } },
            codeLetters: {
              include: {
                recipients: { where: { studentId: student.id } },
              },
            },
          },
        })
      : [];
  const latestReportingByProgrammeId = new Map<
    string,
    (typeof reportingSessions)[number]
  >();
  for (const s of reportingSessions) {
    if (!latestReportingByProgrammeId.has(s.programmeId)) {
      latestReportingByProgrammeId.set(s.programmeId, s);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Assigned Programmes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live statuses are shown based on your programme lifecycle.
        </p>
      </div>

      {assignedProgrammes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No assigned programmes yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignedProgrammes.map((p) => {
            const sess = latestReportingByProgrammeId.get(p.programmeId);
            const myAssignmentId = assignmentIdByProgrammeId.get(p.programmeId);
            const iWasReported =
              Boolean(myAssignmentId) &&
              Boolean(
                sess?.reportedParticipants.some(
                  (r) => r.assignmentId === myAssignmentId,
                ),
              );
            const closedCode =
              sess?.status === "CLOSED"
                ? getCodeForStudentFromLetters(sess.codeLetters, student.id)
                : null;

            const highlightClass =
              sess?.status === "IN_PROGRESS"
                ? "border-emerald-500/40 bg-emerald-500/5"
                : sess?.status === "CLOSED"
                  ? "border-blue-500/35 bg-blue-500/5"
                  : sess?.status === "RESET"
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "";

            return (
              <Card key={p.programmeId} className={highlightClass}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="truncate">{p.name}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {sess?.status === "IN_PROGRESS" ? (
                        <>
                          <Badge className="bg-emerald-600 text-white">
                            Live reporting
                          </Badge>
                          {sess.windowEndsAt ? (
                            <ReportingEndsInCountdown
                              endsAt={sess.windowEndsAt.toISOString()}
                            />
                          ) : null}
                        </>
                      ) : null}
                      {sess?.status === "CLOSED" ? (
                        <Badge className="bg-blue-600 text-white">
                          Reporting ended
                        </Badge>
                      ) : null}
                      {sess?.status === "RESET" ? (
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
                    <span className="text-foreground">
                      {p.categoryName ?? "—"}
                    </span>
                  </div>
                  {sess?.status === "CLOSED" && iWasReported && closedCode ? (
                    <div className="text-foreground font-mono text-sm">
                      {p.programmeType === "GROUP"
                        ? "Your team’s code letter:"
                        : "Your code letter:"}{" "}
                      <span className="rounded border border-blue-500/40 bg-blue-500/10 px-2 py-0.5">
                        {closedCode}
                      </span>
                    </div>
                  ) : null}
                  {sess?.status === "CLOSED" && !iWasReported ? (
                    <p className="text-xs text-muted-foreground">
                      You were not marked present when reporting ended.
                    </p>
                  ) : null}
                  {sess?.status === "IN_PROGRESS" ? (
                    <p className="text-xs text-muted-foreground">
                      Report to the stage manager when called.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
