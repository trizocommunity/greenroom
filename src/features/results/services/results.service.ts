import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category,
  programmeCodeLetter as codeLetterTable,
  programmeAssignmentMember as assignmentMemberTable,
  programmeCodeLetterRecipient as codeLetterRecipientTable,
  programmeAssignment as assignmentTable,
  festival as festivals,
  programme as programmeTable,
  programmeReportingSession as reportingSessionTable,
} from "@/core/database/schema";

/** Mutates programmes in place: sets `result.codeLetter` from latest closed reporting session + code-letter recipients. */
export async function enrichProgrammesAssignmentsResultCodeLetters<
  T extends {
    id: string;
    assignments: Array<{
      id?: string | null;
      participant?: { id: string } | null;
      result?: {
        codeLetter?: { code: string; isAbsent?: boolean } | null;
      } | null;
    }>;
  },
>(programmes: T[]): Promise<T[]> {
  if (programmes.length === 0) return programmes;
  const programmeIds = programmes.map((p) => p.id);

  const closedSessions = await db
    .select({
      id: reportingSessionTable.id,
      programmeId: reportingSessionTable.programmeId,
    })
    .from(reportingSessionTable)
    .where(
      and(
        inArray(reportingSessionTable.programmeId, programmeIds),
        eq(reportingSessionTable.status, "CLOSED"),
      ),
    )
    .orderBy(desc(reportingSessionTable.endedAt));

  const latestSessionIdByProgramme = new Map<string, string>();
  for (const row of closedSessions) {
    if (!latestSessionIdByProgramme.has(row.programmeId)) {
      latestSessionIdByProgramme.set(row.programmeId, row.id);
    }
  }

  const sessionIds = [...new Set(latestSessionIdByProgramme.values())];
  if (sessionIds.length === 0) return programmes;

  const letters = await db.query.programmeCodeLetter.findMany({
    where: inArray(codeLetterTable.reportingSessionId, sessionIds),
    columns: {
      id: true,
      programmeId: true,
      reportingSessionId: true,
      code: true,
      isAbsent: true,
    },
    with: {
      programmeCodeLetterRecipients: {
        columns: { participantId: true, assignmentMemberId: true },
      },
    },
  });

  const participantCodeByProgramme = new Map<
    string,
    Map<string, { code: string; isAbsent: boolean }>
  >();
  for (const progId of programmeIds) {
    participantCodeByProgramme.set(progId, new Map());
  }

  const assignmentCodeByProgramme = new Map<
    string,
    Map<string, { code: string; isAbsent: boolean }>
  >();
  for (const progId of programmeIds) {
    assignmentCodeByProgramme.set(progId, new Map());
  }

  for (const cl of letters) {
    const latestForProg = latestSessionIdByProgramme.get(cl.programmeId);
    if (latestForProg !== cl.reportingSessionId) continue;
    const pmap = participantCodeByProgramme.get(cl.programmeId)!;
    const amap = assignmentCodeByProgramme.get(cl.programmeId)!;
    for (const r of cl.programmeCodeLetterRecipients) {
      if (r.participantId) {
        pmap.set(r.participantId, { code: cl.code, isAbsent: cl.isAbsent });
      }
      if (r.assignmentMemberId) {
        const member = await loadMemberAssignmentId(r.assignmentMemberId);
        if (member) {
          if (!amap.has(member)) {
            amap.set(member, { code: cl.code, isAbsent: cl.isAbsent });
          }
        }
      }
    }
  }

  for (const p of programmes) {
    const pmap = participantCodeByProgramme.get(p.id);
    const amap = assignmentCodeByProgramme.get(p.id);
    if (!pmap && !amap) continue;
    for (const a of p.assignments) {
      if (!a.result) continue;
      let data = null;
      if (amap && a.id && amap.has(a.id)) {
        data = amap.get(a.id) ?? null;
      }
      if (!data && pmap && a.participant?.id) {
        data = pmap.get(a.participant.id) ?? null;
      }
      if (data) {
        a.result.codeLetter = { code: data.code, isAbsent: data.isAbsent };
      }
    }
  }

  return programmes;
}

async function loadMemberAssignmentId(memberId: string): Promise<string | null> {
  const row = await db.query.programmeAssignmentMember.findFirst({
    where: eq(assignmentMemberTable.id, memberId),
    columns: { assignmentId: true },
  });
  return row?.assignmentId ?? null;
}

export async function getFestivalResultsDataBySlug(slug: string) {
  const festival = await db.query.festival.findFirst({
    where: eq(festivals.slug, slug),
    with: {
      categories: { orderBy: [asc(category.name)] },
      programmes: {
        with: {
          category: true,
          assignments: {
            with: {
              participant: true,
              group: true,
              result: true,
            },
          },
        },
        orderBy: [asc(programmeTable.name)],
      },
    },
  });

  if (!festival) {
    return { festival: null };
  }

  await enrichProgrammesAssignmentsResultCodeLetters(
    festival.programmes as any,
  );

  return { festival };
}
