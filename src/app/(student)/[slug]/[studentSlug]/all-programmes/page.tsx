import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { prisma } from "@/lib/db";
import { findFestivalBySlug } from "@/server/models/festival.model";
import {
  findStudentByFestivalAndId,
  findStudentByFestivalAndProfileSlug,
} from "@/server/models/student.model";
import { getProgrammeStatusPriorityRank } from "@/lib/programme-status-priority";
import { getTeamLeaderMyStudents } from "@/lib/team-leader/my-team";
import { AllProgrammesClient } from "@/components/student/team-leader/AllProgrammesClient";
import { getExpectedAssignmentsTotal } from "@/lib/programme-assignment-progress";

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export default async function AllProgrammesPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;

  const session = await getSession();
  if (!session?.userId) notFound();

  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();
  await assertFestivalAccess(session, festival.id);

  const canViewProfile = FeatureService.isFeatureEnabled(
    getTierForFeatureCheck(festival.tier),
    "publicStudentProfile",
  );
  if (!canViewProfile) notFound();

  const student = looksLikeUuid(studentSlug)
    ? await findStudentByFestivalAndId(festival.id, studentSlug)
    : await findStudentByFestivalAndProfileSlug(festival.id, studentSlug);
  if (!student) notFound();
  if (!student.isTeamLeader) notFound();

  const { myStudents } = await getTeamLeaderMyStudents(festival.id, student.id);
  const myStudentIds = myStudents.map((s) => s.id);

  const programmesRaw = await prisma.programme.findMany({
    where: { festivalId: festival.id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  const programmes = [...programmesRaw].sort(
    (a, b) => getProgrammeStatusPriorityRank(a.status) - getProgrammeStatusPriorityRank(b.status),
  );
  const groupCount = await prisma.group.count({
    where: { festivalId: festival.id },
  });

  const assignmentCountsRaw =
    programmes.length > 0
      ? await prisma.programmeAssignment.groupBy({
          by: ["programmeId"],
          where: { festivalId: festival.id, programmeId: { in: programmes.map((p) => p.id) } },
          _count: { _all: true },
        })
      : [];
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
      groupTeams: Map<string, { groupId: string; teamNumber: number; groupName: string; members: any[] }>;
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
        team.members.push(student);
      }
    } else {
      if (!entry.individualStudentIds.has(student.id)) {
        entry.individualStudentIds.add(student.id);
        entry.individualMembers.push(student);
      }
    }
  }

  const programmeCards = programmes.map((p: any) => {
    const entry = participantsByProgramme.get(p.id);
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
            })),
          }))
        : [];

    const myIndividualMembers =
      p.type !== "GROUP" && entry?.individualMembers
        ? (entry.individualMembers ?? []).map((m: any) => ({
            id: m.id,
            name: m.name,
            chestNumber: m.chestNumber ?? null,
          }))
        : [];

    const myParticipantCount =
      p.type === "GROUP"
        ? myGroupTeams.reduce((sum, t) => sum + (t.members?.length ?? 0), 0)
        : myIndividualMembers.length;

    const groupIds = p.type === "GROUP" ? Array.from(new Set(myGroupTeams.map((t) => t.groupId))) : [];

    return {
      programmeId: p.id,
      name: p.name,
      status: p.status,
      type: p.type,
      category: {
        id: p.category?.id,
        name: p.category?.name ?? "—",
        type: p.category?.type ?? null,
      },
      groupIds,
      myParticipantCount,
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
  const categoryOptions = Array.from(categoryOptionsMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Programmes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse all festival programmes and your assigned ones.
        </p>
      </div>

      <AllProgrammesClient
        items={programmeCards as any}
        categoryOptions={categoryOptions.sort((a, b) => a.name.localeCompare(b.name))}
      />
    </div>
  );
}

