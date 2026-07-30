import { and, asc, desc, eq, inArray, isNotNull, not, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AllProgrammesClient } from "@/components/participant/team-leader/AllProgrammesClient";
import { requireParticipantAuth } from "@/core/auth/participant-guard";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  programmeCodeLetterRecipient as codeLetterRecipientTable,
  programmeCodeLetter as codeLetterTable,
  group as groupTable,
  programme as programmeTable,
  programmeReportedParticipant as reportedParticipantTable,
  programmeReportingSession as sessionTable,
} from "@/core/database/schema";
import { getTeamLeaderMyParticipants } from "@/features/participants/services/my-team";
import { getExpectedAssignmentsTotal } from "@/features/programmes/services/programme-assignment-progress";
import {
  getCodeForParticipantFromLetters,
  mapSessionCodeLettersForLookup,
} from "@/features/programmes/services/programme-reporting-code";
import { getProgrammeStatusPriorityRank } from "@/features/programmes/services/programme-status-priority";

function isSessionTimedOut(session: any): boolean {
  return Boolean(
    session?.status === "IN_PROGRESS" &&
      session.windowEndsAt &&
      new Date(session.windowEndsAt).getTime() <= Date.now(),
  );
}

export default async function AllProgrammesPage({
  params,
}: {
  params: Promise<{ slug: string; participantSlug: string }>;
}) {
  const { slug, participantSlug } = await params;

  const { festival, participant } = await requireParticipantAuth(
    slug,
    participantSlug,
    true,
  );

  const { myParticipants } = await getTeamLeaderMyParticipants(
    festival.id,
    participant.id,
  );
  const myParticipantIds = myParticipants.map((s) => s.id);

  const programmesRaw = await db.query.programme.findMany({
    where: eq(programmeTable.festivalId, festival.id),
    with: { category: true },
    orderBy: [desc(programmeTable.createdAt)],
  });

  const programmes = [...programmesRaw].sort(
    (a, b) =>
      getProgrammeStatusPriorityRank(a.status as any) -
      getProgrammeStatusPriorityRank(b.status as any),
  );

  const [groupCountResult] = await db
    .select({ count: sql`count(*)` })
    .from(groupTable)
    .where(eq(groupTable.festivalId, festival.id));
  const groupCount = Number(groupCountResult.count);

  const assignmentCountsRaw =
    programmes.length > 0
      ? await db
          .select({
            programmeId: assignmentTable.programmeId,
            count: sql`count(*)`,
          })
          .from(assignmentTable)
          .where(
            and(
              eq(assignmentTable.festivalId, festival.id),
              inArray(
                assignmentTable.programmeId,
                programmes.map((p) => p.id),
              ),
            ),
          )
          .groupBy(assignmentTable.programmeId)
      : [];

  const programmeIds = programmes.map((p) => p.id);
  const allReportingSessions =
    programmeIds.length > 0
      ? await db.query.programmeReportingSession.findMany({
          where: and(
            eq(sessionTable.festivalId, festival.id),
            inArray(sessionTable.programmeId, programmeIds),
          ),
          with: {
            programmeReportedParticipants: { columns: { assignmentId: true } },
            programmeCodeLetters: {
              with: {
                programmeCodeLetterRecipients: {
                  columns: { participantId: true },
                },
              },
            },
          },
          orderBy: [desc(sessionTable.updatedAt)],
        })
      : [];

  const latestReportingByProgrammeId = new Map<string, any>();
  for (const s of allReportingSessions) {
    if (!latestReportingByProgrammeId.has(s.programmeId)) {
      latestReportingByProgrammeId.set(s.programmeId, s);
    }
  }
  const assignmentCountByProgramme = new Map<string, number>(
    assignmentCountsRaw.map((r) => [r.programmeId, Number(r.count)]),
  );

  const myAssignments = myParticipantIds.length
    ? await db.query.programmeAssignment.findMany({
        where: and(
          eq(assignmentTable.festivalId, festival.id),
          inArray(assignmentTable.participantId, myParticipantIds),
        ),
        with: {
          programme: { with: { category: true } },
          participant: { columns: { id: true, name: true, chestNumber: true } },
          group: true,
          category: true,
        },
        orderBy: [desc(assignmentTable.assignedAt)],
      })
    : [];

  const groupProgrammeIds = programmes
    .filter((p) => p.type === "GROUP")
    .map((p) => p.id);

  const groupProgrammeAssignments =
    groupProgrammeIds.length > 0
      ? await db.query.programmeAssignment.findMany({
          where: and(
            eq(assignmentTable.festivalId, festival.id),
            inArray(assignmentTable.programmeId, groupProgrammeIds),
            eq(assignmentTable.groupId, participant.groupId!),
            isNotNull(assignmentTable.participantId),
          ),
          with: {
            participant: {
              columns: { id: true, name: true, chestNumber: true },
            },
            group: true,
          },
        })
      : [];

  const participantsByProgramme = new Map<
    string,
    {
      programmeType: string;
      individualMembers: any[];
      individualParticipantIds: Set<string>;
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
        individualParticipantIds: new Set<string>(),
        individualMembers: [],
        groupTeams: new Map(),
      });
    }

    const entry = participantsByProgramme.get(programmeId)!;
    const participant = a.participant;
    if (!participant) continue;

    if (programmeType === "GROUP") {
      const groupName = a.group?.name ?? "—";
      const teamNumber = a.teamNumber ?? 1;
      const groupId = a.group?.id ?? participant.groupId;
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
      if (!team.members.some((m: any) => m.id === participant.id)) {
        team.members.push({
          id: participant.id,
          name: participant.name,
          chestNumber: participant.chestNumber ?? null,
          assignmentId: a.id,
        });
      }
    } else {
      if (!entry.individualParticipantIds.has(participant.id)) {
        entry.individualParticipantIds.add(participant.id);
        entry.individualMembers.push({
          id: participant.id,
          name: participant.name,
          chestNumber: participant.chestNumber ?? null,
          assignmentId: a.id,
        });
      }
    }
  }

  function reportingNoteForMember(
    programmeType: string,
    sess: any | undefined,
    assignmentId: string | undefined,
    memberParticipantId: string | undefined,
  ): string | null {
    if (!sess || !assignmentId) return null;
    const reported = sess.programmeReportedParticipants.some(
      (r: any) => r.assignmentId === assignmentId,
    );
    const code =
      sess.status === "CLOSED" && memberParticipantId
        ? getCodeForParticipantFromLetters(
            mapSessionCodeLettersForLookup(sess.programmeCodeLetters),
            memberParticipantId,
          )
        : null;
    if (sess.status === "IN_PROGRESS" && !isSessionTimedOut(sess)) {
      return reported ? "Reported" : "Pending";
    }
    if (sess.status === "IN_PROGRESS" && isSessionTimedOut(sess)) {
      return reported ? "Reported" : "Not reported";
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
      latestSession?.programmeReportedParticipants.map(
        (r: any) => r.assignmentId,
      ) ?? [],
    );

    const myGroupTeams =
      p.type === "GROUP"
        ? (() => {
            const teamMap = new Map<
              string,
              {
                groupId: string;
                groupName: string;
                teamNumber: number;
                members: Array<{
                  id: string;
                  name: string;
                  chestNumber: string | null;
                  assignmentId: string;
                  reportingNote: string | null;
                }>;
              }
            >();

            for (const a of groupProgrammeAssignments as any[]) {
              if (a.programmeId !== p.id || !a.participant) continue;
              const gid = a.group?.id ?? "__unknown__";
              const teamNum = a.teamNumber ?? 1;
              const key = `${gid}:${teamNum}`;
              if (!teamMap.has(key)) {
                teamMap.set(key, {
                  groupId: gid,
                  groupName: a.group?.name ?? "—",
                  teamNumber: teamNum,
                  members: [],
                });
              }
              teamMap.get(key)!.members.push({
                id: a.participant.id,
                name: a.participant.name,
                chestNumber: a.participant.chestNumber ?? null,
                assignmentId: a.id,
                reportingNote: reportingNoteForMember(
                  p.type,
                  latestSession,
                  a.id,
                  a.participant.id,
                ),
              });
            }

            return Array.from(teamMap.values()).sort((x, y) => {
              const g = x.groupName.localeCompare(y.groupName, undefined, {
                sensitivity: "base",
              });
              if (g !== 0) return g;
              return x.teamNumber - y.teamNumber;
            });
          })()
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
    if (
      latestSession?.status === "IN_PROGRESS" &&
      !isSessionTimedOut(latestSession)
    )
      reportingHighlight = "live";
    else if (
      latestSession?.status === "IN_PROGRESS" &&
      isSessionTimedOut(latestSession)
    )
      reportingHighlight = "reset";
    else if (latestSession?.status === "CLOSED") reportingHighlight = "closed";
    else if (latestSession?.status === "RESET") reportingHighlight = "reset";

    let sessionCodeLetter: string | null = null;
    if (latestSession?.status === "CLOSED" && p.type === "GROUP") {
      for (const team of myGroupTeams) {
        const teamCode = team.members
          .map((m) => {
            if (!m.reportingNote?.startsWith("Team code ")) return null;
            return m.reportingNote.replace("Team code ", "").trim() || null;
          })
          .find(Boolean);
        if (teamCode) {
          sessionCodeLetter = teamCode;
          break;
        }
      }
    } else if (
      latestSession?.status === "CLOSED" &&
      myIndividualMembers.length > 0
    ) {
      const firstWithCode = myIndividualMembers.find((m) =>
        m.reportingNote?.startsWith("Code "),
      );
      if (firstWithCode?.reportingNote) {
        sessionCodeLetter =
          firstWithCode.reportingNote.replace("Code ", "").trim() || null;
      }
    }
    const reportingWindowEndsAt =
      latestSession?.status === "IN_PROGRESS" &&
      !isSessionTimedOut(latestSession) &&
      latestSession.windowEndsAt
        ? latestSession.windowEndsAt
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
        programmeType: p.type as any,
        groupCount,
        maxParticipantsPerGroup: p.maxParticipantsPerGroup,
        maxTeamsPerGroup: p.maxTeamsPerGroup,
        maxParticipantsPerTeam: p.maxParticipantsPerTeam,
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
        items={programmeCards as any[]}
        categoryOptions={categoryOptions.sort((a, b) =>
          a.name.localeCompare(b.name),
        )}
      />
    </div>
  );
}

function isNotNullValue<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
