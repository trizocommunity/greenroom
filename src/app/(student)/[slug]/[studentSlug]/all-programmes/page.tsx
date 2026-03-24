import { notFound } from "next/navigation";
import { AllProgrammesClient } from "@/components/student/team-leader/AllProgrammesClient";
import { prisma } from "@/lib/db";
import { getExpectedAssignmentsTotal } from "@/lib/programme-assignment-progress";
import { getCodeForStudentFromLetters } from "@/lib/programme-reporting-code";
import { getProgrammeStatusPriorityRank } from "@/lib/programme-status-priority";
import { getTeamLeaderMyStudents } from "@/lib/team-leader/my-team";
import { requireTeamLeaderSession } from "@/lib/team-leader-auth/guard";

export default async function AllProgrammesPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;

  const { festival, student } = await requireTeamLeaderSession({
    slug,
    studentSlug,
  });

  const { myStudents } = await getTeamLeaderMyStudents(festival.id, student.id);
  const myStudentIds = myStudents.map((s) => s.id);

  const programmesRaw = await prisma.programme.findMany({
    where: { festivalId: festival.id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  const programmes = [...programmesRaw].sort(
    (a, b) =>
      getProgrammeStatusPriorityRank(a.status) -
      getProgrammeStatusPriorityRank(b.status),
  );
  const groupCount = await prisma.group.count({
    where: { festivalId: festival.id },
  });

  const assignmentCountsRaw =
    programmes.length > 0
      ? await prisma.programmeAssignment.groupBy({
          by: ["programmeId"],
          where: {
            festivalId: festival.id,
            programmeId: { in: programmes.map((p) => p.id) },
          },
          _count: { _all: true },
        })
      : [];
  const programmeIds = programmes.map((p) => p.id);
  const allReportingSessions =
    programmeIds.length > 0
      ? await prisma.programmeReportingSession.findMany({
          where: { festivalId: festival.id, programmeId: { in: programmeIds } },
          orderBy: { updatedAt: "desc" },
          include: {
            reportedParticipants: { select: { assignmentId: true } },
            codeLetters: {
              include: {
                recipients: { select: { studentId: true } },
              },
            },
          },
        })
      : [];
  const latestReportingByProgrammeId = new Map<
    string,
    (typeof allReportingSessions)[number]
  >();
  for (const s of allReportingSessions) {
    if (!latestReportingByProgrammeId.has(s.programmeId)) {
      latestReportingByProgrammeId.set(s.programmeId, s);
    }
  }
  const assignmentCountByProgramme = new Map<string, number>(
    assignmentCountsRaw.map((r) => [r.programmeId, r._count._all]),
  );

  const myAssignments = myStudentIds.length
    ? await prisma.programmeAssignment.findMany({
        where: { festivalId: festival.id, studentId: { in: myStudentIds } },
        include: {
          programme: { include: { category: true } },
          student: { select: { id: true, name: true, chestNumber: true } },
          group: true,
          category: true,
        },
        orderBy: { assignedAt: "desc" },
      })
    : [];

  // programmeId -> { individual: Student[], group: { key: teamNumber -> Student[] } }
  const participantsByProgramme = new Map<
    string,
    {
      programmeType: string;
      individualMembers: any[];
      individualStudentIds: Set<string>;
      groupTeams: Map<
        string,
        {
          groupId: string;
          teamNumber: number;
          groupName: string;
          members: any[];
        }
      >;
    }
  >();

  for (const a of myAssignments as any[]) {
    const p = a.programme;
    const programmeId = a.programmeId ?? p?.id;
    if (!programmeId || !p) continue;
    const programmeType = p.type;

    if (!participantsByProgramme.has(programmeId)) {
      participantsByProgramme.set(programmeId, {
        programmeType,
        individualStudentIds: new Set<string>(),
        individualMembers: [],
        groupTeams: new Map(),
      });
    }

    const entry = participantsByProgramme.get(programmeId)!;
    const student = a.student;
    if (!student) continue;

    if (programmeType === "GROUP") {
      const groupName = a.group?.name ?? "—";
      const teamNumber = a.teamNumber ?? 1;
      const groupId = a.group?.id ?? student.groupId;
      const teamKey = `${a.group?.id ?? "unknown"}:${teamNumber}`;

      if (!entry.groupTeams.has(teamKey)) {
        entry.groupTeams.set(teamKey, {
          groupId,
          teamNumber,
          groupName,
          members: [],
        });
      }
      const team = entry.groupTeams.get(teamKey)!;
      if (!team.members.some((m: any) => m.id === student.id)) {
        team.members.push({
          id: student.id,
          name: student.name,
          chestNumber: student.chestNumber ?? null,
          assignmentId: a.id,
        });
      }
    } else {
      if (!entry.individualStudentIds.has(student.id)) {
        entry.individualStudentIds.add(student.id);
        entry.individualMembers.push({
          id: student.id,
          name: student.name,
          chestNumber: student.chestNumber ?? null,
          assignmentId: a.id,
        });
      }
    }
  }

  function reportingNoteForMember(
    programmeType: string,
    sess: (typeof allReportingSessions)[number] | undefined,
    assignmentId: string | undefined,
    memberStudentId: string | undefined,
  ): string | null {
    if (!sess || !assignmentId) return null;
    const reported = sess.reportedParticipants.some(
      (r) => r.assignmentId === assignmentId,
    );
    const code =
      sess.status === "CLOSED" && memberStudentId
        ? getCodeForStudentFromLetters(sess.codeLetters, memberStudentId)
        : null;
    if (sess.status === "IN_PROGRESS") {
      return reported ? "Reported" : "Pending";
    }
    if (sess.status === "CLOSED") {
      if (reported && code) {
        return programmeType === "GROUP" ? `Team code ${code}` : `Code ${code}`;
      }
      if (reported) return "Reported";
      return "Not reported";
    }
    if (sess.status === "RESET") {
      return "Reporting closed";
    }
    return null;
  }

  const programmeCards = programmes.map((p: any) => {
    const entry = participantsByProgramme.get(p.id);
    const latestSession = latestReportingByProgrammeId.get(p.id);
    const reportedAssignmentIds = new Set(
      latestSession?.reportedParticipants.map((r) => r.assignmentId) ?? [],
    );

    const myGroupTeams =
      p.type === "GROUP" && entry?.groupTeams
        ? Array.from(entry.groupTeams.values()).map((t: any) => ({
            groupId: t.groupId,
            groupName: t.groupName,
            teamNumber: t.teamNumber,
            members: (t.members ?? []).map((m: any) => ({
              id: m.id,
              name: m.name,
              chestNumber: m.chestNumber ?? null,
              assignmentId: m.assignmentId as string,
              reportingNote: reportingNoteForMember(
                p.type,
                latestSession,
                m.assignmentId,
                m.id,
              ),
            })),
          }))
        : [];

    const myIndividualMembers =
      p.type !== "GROUP" && entry?.individualMembers
        ? (entry.individualMembers ?? []).map((m: any) => ({
            id: m.id,
            name: m.name,
            chestNumber: m.chestNumber ?? null,
            assignmentId: m.assignmentId as string,
            reportingNote: reportingNoteForMember(
              p.type,
              latestSession,
              m.assignmentId,
              m.id,
            ),
          }))
        : [];

    const myParticipantCount =
      p.type === "GROUP"
        ? myGroupTeams.reduce((sum, t) => sum + (t.members?.length ?? 0), 0)
        : myIndividualMembers.length;

    const myAssignmentIdsForProgramme = myAssignments
      .filter((row: any) => row.programmeId === p.id)
      .map((row: any) => row.id as string);
    const reportedOnTeam = myAssignmentIdsForProgramme.filter((id) =>
      reportedAssignmentIds.has(id),
    ).length;
    const pendingOnTeam = myAssignmentIdsForProgramme.length - reportedOnTeam;

    const groupIds =
      p.type === "GROUP"
        ? Array.from(new Set(myGroupTeams.map((t) => t.groupId)))
        : [];

    let reportingHighlight: "live" | "closed" | "reset" | null = null;
    if (latestSession?.status === "IN_PROGRESS") reportingHighlight = "live";
    else if (latestSession?.status === "CLOSED") reportingHighlight = "closed";
    else if (latestSession?.status === "RESET") reportingHighlight = "reset";

    const sessionCodeLetter = null;
    const reportingWindowEndsAt =
      latestSession?.status === "IN_PROGRESS" && latestSession.windowEndsAt
        ? latestSession.windowEndsAt.toISOString()
        : null;

    return {
      programmeId: p.id,
      name: p.name,
      status: p.status,
      type: p.type,
      category: {
        id: p.category?.id ?? "",
        name: p.category?.name ?? "—",
        type: p.category?.type ?? null,
      },
      groupIds,
      myParticipantCount,
      reportingHighlight,
      reportingWindowEndsAt,
      sessionCodeLetter,
      teamReportingCounts:
        myAssignmentIdsForProgramme.length > 0 && latestSession
          ? {
              reported: reportedOnTeam,
              pending: pendingOnTeam,
              total: myAssignmentIdsForProgramme.length,
            }
          : null,
      assignedCount: assignmentCountByProgramme.get(p.id) ?? 0,
      expectedAssignments: getExpectedAssignmentsTotal({
        programmeType: p.type,
        groupCount,
        maxParticipantsPerGroup: p.maxParticipantsPerGroup,
        maxTeamsPerGroup: p.maxTeamsPerGroup,
        maxStudentsPerTeam: p.maxStudentsPerTeam,
      }),
      myGroupTeams,
      myIndividualMembers,
    };
  });

  const categoryOptionsMap = new Map<string, string>();
  for (const p of programmes as any[]) {
    if (!p.category?.id) continue;
    categoryOptionsMap.set(p.category.id, p.category.name ?? "—");
  }
  const categoryOptions = Array.from(categoryOptionsMap.entries()).map(
    ([id, name]) => ({
      id,
      name,
    }),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Programmes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All festival programmes with live reporting, code letters, and your
          team’s attendance per programme.
        </p>
      </div>

      <AllProgrammesClient
        items={programmeCards}
        categoryOptions={categoryOptions.sort((a, b) =>
          a.name.localeCompare(b.name),
        )}
      />
    </div>
  );
}
