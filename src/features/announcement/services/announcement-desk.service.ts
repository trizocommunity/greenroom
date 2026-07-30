import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  programmeCodeLetter as programmeCodeLetterTable,
  programme as programmeTable,
  result as resultTable,
} from "@/core/database/schema";
import {
  countResultSlots,
  getAnnouncerBlockProgress,
  resultSlotKey,
} from "@/features/announcement/services/announcer-result-count.service";

export type AnnouncementDeskProgramme = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  type: string;
  categoryName: string | null;
  resultSlotCount: number;
  publishedSlotCount: number;
  announcedSlotCount: number;
  results: {
    id: string;
    position: number | null;
    points: number;
    grade: string | null;
    isPublished: boolean;
    isAnnounced: boolean;
    winnerName: string;
    groupName: string | null;
    teamNumber?: number | null;
    participantNames?: string[];
    code: string | null;
  }[];
  codeLetters: {
    id: string;
    code: string;
    participants: {
      name: string;
      chestNumber: string | null;
      groupName: string | null;
    }[];
  }[];
};

export async function getAnnouncementDeskQueue(festivalId: string) {
  const [programmes, results, codeLetters, block] = await Promise.all([
    db.query.programme.findMany({
      where: eq(programmeTable.festivalId, festivalId),
      with: { category: { columns: { name: true } } },
      orderBy: [desc(programmeTable.updatedAt)],
    }),
    db.query.result.findMany({
      where: eq(resultTable.festivalId, festivalId),
      with: {
        programme: { columns: { id: true, type: true } },
        programmeAssignment: {
          with: {
            participant: { columns: { name: true } },
            group: { columns: { id: true, name: true } },
          },
        },
      },
      orderBy: [asc(resultTable.position)],
    }),
    db.query.programmeCodeLetter.findMany({
      where: eq(programmeCodeLetterTable.festivalId, festivalId),
      with: {
        programmeCodeLetterRecipients: {
          with: {
            participant: {
              columns: { name: true, chestNumber: true, groupId: true },
              with: {
                group: { columns: { name: true } },
              },
            },
          },
        },
      },
    }),
    getAnnouncerBlockProgress(festivalId),
  ]);

  const resultsByProgramme = new Map<string, typeof results>();
  for (const r of results) {
    const list = resultsByProgramme.get(r.programmeId) ?? [];
    list.push(r);
    resultsByProgramme.set(r.programmeId, list);
  }

  const codeLettersByProgramme = new Map<string, typeof codeLetters>();
  for (const cl of codeLetters) {
    const list = codeLettersByProgramme.get(cl.programmeId) ?? [];
    list.push(cl);
    codeLettersByProgramme.set(cl.programmeId, list);
  }

  const queue: AnnouncementDeskProgramme[] = [];
  const announced: AnnouncementDeskProgramme[] = [];

  for (const p of programmes) {
    const progResults = resultsByProgramme.get(p.id) ?? [];
    if (progResults.length === 0) continue;

    const slotRows = progResults.map((r) => ({
      id: r.id,
      isPublished: r.isPublished,
      isAnnounced: r.isAnnounced,
      programmeId: r.programmeId,
      programme: r.programme,
      programmeAssignment: r.programmeAssignment,
    }));

    const publishedSlotCount = countResultSlots(slotRows, "published");
    const announcedSlotCount = countResultSlots(slotRows, "announced");
    if (publishedSlotCount === 0) continue;

    const progCodeLetters = codeLettersByProgramme.get(p.id) ?? [];
    const participantToCodeMap = new Map<string, string>();
    for (const cl of progCodeLetters) {
      for (const recipient of cl.programmeCodeLetterRecipients ?? []) {
        if (recipient.participantId) {
          participantToCodeMap.set(recipient.participantId, cl.code);
        }
      }
    }

    let resultsMapped: AnnouncementDeskProgramme["results"] = [];

    if (p.type === "GROUP") {
      // Group by groupId and teamNumber
      const teamGroups = new Map<string, typeof progResults>();
      for (const r of progResults) {
        const key = `${r.programmeAssignment?.groupId ?? ""}_${r.programmeAssignment?.teamNumber ?? 1}`;
        const list = teamGroups.get(key) ?? [];
        list.push(r);
        teamGroups.set(key, list);
      }

      for (const [key, list] of teamGroups.entries()) {
        const first = list[0];
        if (!first) continue;
        const groupName = first.programmeAssignment?.group?.name || "—";
        const teamNumber = first.programmeAssignment?.teamNumber ?? 1;
        const participantNames = list
          .map((r) => r.programmeAssignment?.participant?.name)
          .filter((name): name is string => name != null);

        let code: string | null = null;
        for (const r of list) {
          const participantId = r.programmeAssignment?.participantId;
          if (participantId) {
            const foundCode = participantToCodeMap.get(participantId);
            if (foundCode) {
              code = foundCode;
              break;
            }
          }
        }

        const firstMember = participantNames[0] || "Unknown";
        resultsMapped.push({
          id: first.id,
          position: first.position,
          points: first.awardPoints ?? first.points,
          grade: first.grade,
          isPublished: first.isPublished,
          isAnnounced: first.isAnnounced,
          winnerName: `${firstMember} & team`,
          groupName,
          teamNumber,
          participantNames,
          code,
        });
      }
      resultsMapped.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
    } else {
      resultsMapped = progResults.map((r) => {
        const assignment = r.programmeAssignment;
        const participant = assignment?.participant;
        const winnerName = participant?.name || assignment?.group?.name || "—";
        const code = assignment?.participantId
          ? (participantToCodeMap.get(assignment.participantId) ?? null)
          : null;
        return {
          id: r.id,
          position: r.position,
          points: r.awardPoints ?? r.points,
          grade: r.grade,
          isPublished: r.isPublished,
          isAnnounced: r.isAnnounced,
          winnerName,
          groupName: assignment?.group?.name ?? null,
          teamNumber: assignment?.teamNumber ?? null,
          participantNames: participant?.name ? [participant.name] : [],
          code,
        };
      });
    }

    const codeLettersMapped = progCodeLetters.map((cl) => {
      const participants = (cl.programmeCodeLetterRecipients ?? []).map((r) => {
        const participant = r.participant;
        return {
          name: participant?.name ?? "—",
          chestNumber: participant?.chestNumber ?? null,
          groupName: participant?.group?.name ?? null,
        };
      });
      return {
        id: cl.id,
        code: cl.code,
        participants,
      };
    });
    codeLettersMapped.sort((a, b) => a.code.localeCompare(b.code));

    const row: AnnouncementDeskProgramme = {
      id: p.id,
      name: p.name,
      code: null,
      status: p.status,
      type: p.type,
      categoryName: p.category?.name ?? null,
      resultSlotCount: new Set(slotRows.map(resultSlotKey)).size,
      publishedSlotCount,
      announcedSlotCount,
      results: resultsMapped,
      codeLetters: codeLettersMapped,
    };

    if (publishedSlotCount > 0 && announcedSlotCount < publishedSlotCount) {
      queue.push(row);
    } else if (
      announcedSlotCount > 0 &&
      announcedSlotCount >= publishedSlotCount
    ) {
      announced.push(row);
    }
  }

  return { queue, recentlyAnnounced: announced, block };
}

export async function getAnnouncerOverviewStats(festivalId: string) {
  const [block, festival] = await Promise.all([
    getAnnouncerBlockProgress(festivalId),
    db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      columns: { teamStandings: true },
    }),
  ]);

  const programmes = await db.query.programme.findMany({
    where: eq(programmeTable.festivalId, festivalId),
    columns: { id: true },
  });

  const allResults = await db.query.result.findMany({
    where: eq(resultTable.festivalId, festivalId),
    columns: {
      id: true,
      isPublished: true,
      isAnnounced: true,
      programmeId: true,
    },
    with: {
      programme: { columns: { id: true, type: true } },
      programmeAssignment: {
        columns: { teamNumber: true },
        with: { group: { columns: { id: true } } },
      },
    },
  });

  let pendingOnDesk = 0;
  let announcedProgrammes = 0;

  for (const pid of programmes.map((p) => p.id)) {
    const rows = allResults.filter((r) => r.programmeId === pid);
    if (rows.length === 0) continue;
    const slotRows = rows.map((r) => ({
      id: r.id,
      isPublished: r.isPublished,
      isAnnounced: r.isAnnounced,
      programmeId: r.programmeId,
      programme: r.programme,
      programmeAssignment: r.programmeAssignment,
    }));
    const pub = countResultSlots(slotRows, "published");
    const ann = countResultSlots(slotRows, "announced");
    if (pub === 0) continue;
    if (ann < pub) pendingOnDesk += 1;
    else announcedProgrammes += 1;
  }

  return {
    pendingOnDesk,
    announcedProgrammes,
    ...block,
    hasPublishedStandings: Boolean(
      festival?.teamStandings &&
        Array.isArray(festival.teamStandings) &&
        festival.teamStandings.length > 0,
    ),
  };
}
