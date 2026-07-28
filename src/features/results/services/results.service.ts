import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category,
  programmeCodeLetter as codeLetterTable,
  festival as festivals,
  programme as programmeTable,
  programmeReportingSession as reportingSessionTable,
} from "@/core/database/schema";

/** Mutates programmes in place: sets `result.codeLetter` from latest closed reporting session + code-letter recipients. */
export async function enrichProgrammesAssignmentsResultCodeLetters<
  T extends {
    id: string;
    assignments: Array<{
      participant?: { id: string } | null;
      result?: { codeLetter?: { code: string } | null } | null;
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
    },
    with: {
      programmeCodeLetterRecipients: { columns: { participantId: true } },
    },
  });

  const participantCodeByProgramme = new Map<string, Map<string, string>>();
  for (const progId of programmeIds) {
    participantCodeByProgramme.set(progId, new Map());
  }

  for (const cl of letters) {
    const latestForProg = latestSessionIdByProgramme.get(cl.programmeId);
    if (latestForProg !== cl.reportingSessionId) continue;
    const map = participantCodeByProgramme.get(cl.programmeId)!;
    for (const r of cl.programmeCodeLetterRecipients) {
      map.set(r.participantId, cl.code);
    }
  }

  for (const p of programmes) {
    const map = participantCodeByProgramme.get(p.id);
    if (!map) continue;
    for (const a of p.assignments) {
      const sid = a.participant?.id;
      if (!sid || !a.result) continue;
      const code = map.get(sid);
      if (code) {
        a.result.codeLetter = { code };
      }
    }
  }

  return programmes;
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
