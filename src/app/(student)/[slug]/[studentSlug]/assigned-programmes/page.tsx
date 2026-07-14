import { desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { StudentAssignedProgrammeCards } from "@/components/student/StudentAssignedProgrammeCards";
import { db } from "@/core/database/client";
import { programmeReportingSession as sessionTable } from "@/core/database/schema";
import type { ProgrammeStatus } from "@/core/types/app-enums";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";
import { indexReportingSessionsByProgramme } from "@/features/programmes/services/programme-reporting-display";
import { getProgrammeStatusPriorityRank } from "@/features/programmes/services/programme-status-priority";
import { findStudentByFestivalAndProfileSlug } from "@/features/students/repositories/student.repository";

const RESERVED_SLUGS = new Set([
  "results",
  "gallery",
  "news",
  "programmes",
  "sessions",
  "about",
]);

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
    getTierForFeatureCheck(festival.tier as any),
    "publicStudentProfile",
  );
  if (!canViewProfile) notFound();

  const student = await findStudentByFestivalAndProfileSlug(
    festival.id,
    studentSlug,
  );
  if (!student) notFound();

  if (student.isTeamLeader) notFound();

  const programmeById = new Map<
    string,
    {
      programmeId: string;
      name: string;
      categoryName: string | null;
      status: ProgrammeStatus;
      programmeType: string;
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
      categoryName: (p as any).category?.name ?? null,
      status: p.status as ProgrammeStatus,
      programmeType: p.type,
    });
  }

  const programmes = Array.from(programmeById.values()).sort((a, b) => {
    return (
      getProgrammeStatusPriorityRank(a.status) -
      getProgrammeStatusPriorityRank(b.status)
    );
  });

  const assignmentIdByProgrammeId = new Map<string, string>();
  for (const a of student.assignments ?? []) {
    const pid = a.programme?.id;
    if (pid) assignmentIdByProgrammeId.set(pid, a.id);
  }

  const programmeIds = programmes.map((p) => p.programmeId);
  const reportingSessions =
    programmeIds.length > 0
      ? await db.query.programmeReportingSession.findMany({
          where: inArray(sessionTable.programmeId, programmeIds),
          with: {
            programmeReportedParticipants: { columns: { assignmentId: true } },
            programmeCodeLetters: {
              with: {
                programmeCodeLetterRecipients: {
                  columns: { studentId: true },
                },
              },
            },
          },
          orderBy: [desc(sessionTable.updatedAt)],
        })
      : [];

  const { latestByProgrammeId, latestClosedByProgrammeId } =
    indexReportingSessionsByProgramme(reportingSessions);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Assigned Programmes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live statuses and your code letters after reporting ends.
        </p>
      </div>

      <StudentAssignedProgrammeCards
        programmes={programmes}
        latestReportingByProgrammeId={latestByProgrammeId}
        latestClosedReportingByProgrammeId={latestClosedByProgrammeId}
        assignmentIdByProgrammeId={assignmentIdByProgrammeId}
        studentId={student.id}
      />
    </div>
  );
}
