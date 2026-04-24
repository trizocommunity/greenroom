import { db } from "@/lib/db";
import { 
  student as studentTable, 
  programmeAssignment as assignmentTable,
  programme as programmeTable
} from "@/server/db/schema";
import { eq, and, gte, isNotNull, ne, inArray, desc, sql } from "drizzle-orm";

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
  const leader = await db.query.student.findFirst({
    where: and(eq(studentTable.id, leaderStudentId), eq(studentTable.festivalId, festivalId)),
    with: {
      group: { columns: { id: true, name: true, color: true } },
    },
    columns: {
      id: true,
      groupId: true,
      profileSlug: true,
    },
  });

  if (!leader?.groupId) {
    return {
      myStudents: [] as StudentSummaryForStudentPage[],
      derivedTeamContexts: [] as DerivedTeamContextKey[],
    };
  }

  const derivedContextsRows = await db.query.programmeAssignment.findMany({
    where: and(
      eq(assignmentTable.festivalId, festivalId),
      eq(assignmentTable.studentId, leaderStudentId),
      gte(assignmentTable.teamNumber, 1),
      isNotNull(assignmentTable.groupId)
    ),
    with: {
      programme: { columns: { type: true } },
    },
    columns: { programmeId: true, groupId: true, teamNumber: true },
  });
  
  // Filter for GROUP type programmes manually if not using a complex join
  const filteredDerived = derivedContextsRows.filter(row => row.programme?.type === "GROUP");

  const contextsMap = new Map<string, DerivedTeamContextKey>();
  for (const row of filteredDerived) {
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
    for (const ctx of derivedTeamContexts) {
      const participants = await db.query.programmeAssignment.findMany({
        where: and(
          eq(assignmentTable.festivalId, festivalId),
          eq(assignmentTable.programmeId, ctx.programmeId),
          eq(assignmentTable.groupId, ctx.groupId),
          eq(assignmentTable.teamNumber, ctx.teamNumber),
          isNotNull(assignmentTable.studentId)
        ),
        with: {
          student: {
            with: {
              group: { columns: { id: true, name: true, color: true } },
              category: { columns: { id: true, name: true, type: true } },
            },
          },
        },
      });

      for (const p of participants) {
        if (!p.student) continue;
        myStudentsMap.set(p.student.id, p.student as any);
      }
    }
  }

  if (myStudentsMap.size === 0) {
    const groupStudents = await db.query.student.findMany({
      where: and(eq(studentTable.festivalId, festivalId), eq(studentTable.groupId, leader.groupId)),
      with: {
        group: { columns: { id: true, name: true, color: true } },
        category: { columns: { id: true, name: true, type: true } },
      },
      orderBy: [desc(studentTable.createdAt)],
    });

    for (const s of groupStudents) myStudentsMap.set(s.id, s as any);
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
  const leader = await db.query.student.findFirst({
    where: and(eq(studentTable.id, leaderStudentId), eq(studentTable.festivalId, festivalId)),
    columns: { groupId: true },
  });

  if (!leader?.groupId) {
    return { groupStudents: [] as StudentSummaryForStudentPage[] };
  }

  const groupStudents = await db.query.student.findMany({
    where: and(eq(studentTable.festivalId, festivalId), eq(studentTable.groupId, leader.groupId)),
    with: {
      group: { columns: { id: true, name: true, color: true } },
      category: { columns: { id: true, name: true, type: true } },
    },
    orderBy: [desc(studentTable.createdAt)],
  });

  return { groupStudents: groupStudents as any[] };
}
