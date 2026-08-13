import { desc, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { APP_CONTAINER, AppPageHeader } from "@/components/app/AppSection";
import { DeadlinesCard } from "@/components/festival/pre-event-works/DeadlinesCard";
import { AssignProgrammesClient } from "@/components/participant/team-leader/AssignProgrammesClient";
import { requireParticipantAuth } from "@/core/auth/participant-guard";
import { db } from "@/core/database/client";
import {
  group as groupTable,
  programme as programmeTable,
  programmeTeamLead as programmeTeamLeadTable,
} from "@/core/database/schema";
import { isTeamLeaderActionWindowOpen } from "@/features/festivals/services/deadline-window";
import { getTeamLeaderGroupParticipantsForSelection } from "@/features/participants/services/my-team";
import { isProTier } from "@/features/plan-features/services/tier";

export default async function AssignProgrammesPage({
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

  const windowStart = festival.programmeAssignmentStartDate;
  const deadline = festival.programmeAssignmentDeadline;
  const isReadOnly = !isTeamLeaderActionWindowOpen({
    start: windowStart,
    end: deadline,
  });
  const managerName =
    (festival.user as any)?.displayName ||
    (festival.user as any)?.fullName ||
    (festival.user as any)?.email ||
    null;
  const managerEmail = (festival.user as any)?.email ?? null;
  const managerPhone =
    festival.branding &&
    typeof festival.branding === "object" &&
    ("contactNumber" in (festival.branding as any) ||
      "phone" in (festival.branding as any))
      ? ((festival.branding as any).contactNumber ??
        (festival.branding as any).phone ??
        null)
      : null;

  // Requirement: show/assign from ALL participants in the leader's group.
  const { groupParticipants } =
    await getTeamLeaderGroupParticipantsForSelection(
      festival.id,
      participant.id,
    );

  const programmes = await db.query.programme.findMany({
    where: eq(programmeTable.festivalId, festival.id),
    with: { category: true },
    orderBy: [desc(programmeTable.createdAt)],
  });

  const [groupCountResult] = await db
    .select({ count: sql`count(*)` })
    .from(groupTable)
    .where(eq(groupTable.festivalId, festival.id));
  const groupCount = Number(groupCountResult.count);

  /* PRO festivals require every GROUP team to name a lead before assignments
     save (`AssignmentService.bulkCreate` throws EACH_TEAM_MUST_HAVE_LEAD
     otherwise). The picker only appears when the tier demands it, and only
     for teams that do not already have one — so we ship the existing leads
     for this group down with the page. */
  const requiresTeamLead = isProTier(festival.tier);

  const existingLeadRows = requiresTeamLead
    ? await db.query.programmeTeamLead.findMany({
        where: eq(programmeTeamLeadTable.groupId, participant.groupId!),
        with: {
          participant: { columns: { id: true, name: true } },
        },
      })
    : [];

  const existingTeamLeads: Record<
    string,
    { participantId: string; name: string }
  > = {};
  for (const lead of existingLeadRows) {
    existingTeamLeads[`${lead.programmeId}:${lead.teamNumber}`] = {
      participantId: lead.participantId,
      name: (lead as any).participant?.name ?? "Unknown",
    };
  }

  return (
    <div className={`${APP_CONTAINER} py-8`}>
      <AppPageHeader
        eyebrow="Team leader"
        title="Programme assignments"
        description="Pick the programmes each of your participants will take part in."
        actions={<DeadlinesCard start={windowStart} end={deadline} />}
        className="mb-8"
      />

      <AssignProgrammesClient
        festivalId={festival.id}
        leaderGroupId={participant.groupId!}
        leaderCategoryId={participant.categoryId!}
        isReadOnly={isReadOnly}
        windowStart={windowStart ?? undefined}
        deadline={deadline ?? undefined}
        canAdd={festival.programmeAssignmentCanAdd !== false}
        canDelete={festival.programmeAssignmentCanDelete !== false}
        managerName={managerName}
        managerEmail={managerEmail}
        managerPhone={managerPhone}
        groupCount={groupCount}
        requiresTeamLead={requiresTeamLead}
        existingTeamLeads={existingTeamLeads}
        programmes={programmes.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type as any,
          stageType: p.stageType as any,
          status: p.status as any,
          maxTeamsPerGroup: p.maxTeamsPerGroup,
          maxParticipantsPerTeam: p.maxParticipantsPerTeam,
          maxParticipantsPerGroup: p.maxParticipantsPerGroup,
          category: {
            id: (p as any).category.id,
            name: (p as any).category.name,
            type: (p as any).category.type,
          },
        }))}
        myParticipants={groupParticipants.map((s) => ({
          id: s.id,
          name: s.name,
          chestNumber: s.chestNumber,
          categoryId: (s as any).category?.id ?? participant.categoryId!,
        }))}
      />
    </div>
  );
}
