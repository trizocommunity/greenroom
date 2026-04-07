import { prisma } from "@/lib/db";

export type StudentSummaryForStudentPage = {
  id: string;
  name: string;
  profileSlug: string | null;
  chestNumber: string | null;
  isTeamLeader: boolean;
  groupId: string | null;
  group: { id: string; name: string; color: string } | null;
  category: { id: string; name: string; type: string | null } | null;
};

type DerivedTeamContextKey = {
  programmeId: string;
  groupId: string;
  teamNumber: number;
};

export async function getTeamLeaderMyStudents(
  festivalId: string,
  leaderStudentId: string,
) {
  const leader = await prisma.student.findFirst({
    where: { id: leaderStudentId, festivalId },
    select: {
      id: true,
      groupId: true,
      group: { select: { id: true, name: true, color: true } },
      profileSlug: true,
    },
  });

  if (!leader?.groupId) {
    return {
      myStudents: [] as StudentSummaryForStudentPage[],
      derivedTeamContexts: [] as DerivedTeamContextKey[],
    };
  }

  // Derived team contexts: teams where the leader already participates for GROUP programmes.
  const derivedContextsRows = await prisma.programmeAssignment.findMany({
    where: {
      festivalId,
      studentId: leaderStudentId,
      teamNumber: { gte: 1 },
      groupId: { not: null },
      programme: { type: "GROUP" },
    },
    select: { programmeId: true, groupId: true, teamNumber: true },
  });

  const contextsMap = new Map<string, DerivedTeamContextKey>();
  for (const row of derivedContextsRows) {
    if (!row.groupId) continue;
    const key = `${row.programmeId}:${row.groupId}:${row.teamNumber}`;
    contextsMap.set(key, {
      programmeId: row.programmeId,
      groupId: row.groupId,
      teamNumber: row.teamNumber,
    });
  }
  const derivedTeamContexts = Array.from(contextsMap.values());

  const myStudentsMap = new Map<string, StudentSummaryForStudentPage>();

  if (derivedTeamContexts.length > 0) {
    // Union of participants across all derived team contexts.
    for (const ctx of derivedTeamContexts) {
      const participants = await prisma.programmeAssignment.findMany({
        where: {
          festivalId,
          programmeId: ctx.programmeId,
          groupId: ctx.groupId,
          teamNumber: ctx.teamNumber,
          studentId: { not: null },
        },
        select: {
          studentId: true,
          student: {
            select: {
              id: true,
              name: true,
              profileSlug: true,
              chestNumber: true,
              isTeamLeader: true,
              groupId: true,
              group: { select: { id: true, name: true, color: true } },
              category: { select: { id: true, name: true, type: true } },
            },
          },
        },
      });

      for (const p of participants) {
        if (!p.student) continue;
        myStudentsMap.set(p.student.id, p.student);
      }
    }
  }

  // Fallback: if no derived contexts, show all group students.
  if (myStudentsMap.size === 0) {
    const groupStudents = await prisma.student.findMany({
      where: { festivalId, groupId: leader.groupId },
      select: {
        id: true,
        name: true,
        profileSlug: true,
        chestNumber: true,
        isTeamLeader: true,
        groupId: true,
        group: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    for (const s of groupStudents) myStudentsMap.set(s.id, s);
  }

  return {
    myStudents: Array.from(myStudentsMap.values()),
    derivedTeamContexts,
  };
}

export async function getTeamLeaderGroupStudentsForSelection(
  festivalId: string,
  leaderStudentId: string,
) {
  const leader = await prisma.student.findFirst({
    where: { id: leaderStudentId, festivalId },
    select: { groupId: true },
  });

  if (!leader?.groupId) {
    return { groupStudents: [] as StudentSummaryForStudentPage[] };
  }

  const groupStudents = await prisma.student.findMany({
    where: { festivalId, groupId: leader.groupId },
    select: {
      id: true,
      name: true,
      profileSlug: true,
      chestNumber: true,
      isTeamLeader: true,
      groupId: true,
      group: { select: { id: true, name: true, color: true } },
      category: { select: { id: true, name: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { groupStudents };
}
