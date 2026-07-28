import { desc, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DeadlinesCard } from "@/components/festival/pre-event-works/DeadlinesCard";
import { AssignProgrammesClient } from "@/components/participant/team-leader/AssignProgrammesClient";
import { requireParticipantAuth } from "@/core/auth/participant-guard";
import { db } from "@/core/database/client";
import {
  group as groupTable,
  programme as programmeTable,
} from "@/core/database/schema";
import { getTeamLeaderGroupParticipantsForSelection } from "@/features/participants/services/my-team";

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

  const deadline = festival.programmeAssignmentDeadline;
  const isReadOnly = deadline ? new Date() > new Date(deadline) : false;
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

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Assign Programmes</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <DeadlinesCard />
        </div>
      </div>

      <AssignProgrammesClient
        festivalId={festival.id}
        leaderGroupId={participant.groupId!}
        leaderCategoryId={participant.categoryId!}
        isReadOnly={isReadOnly}
        deadline={deadline ?? undefined}
        managerName={managerName}
        managerEmail={managerEmail}
        managerPhone={managerPhone}
        groupCount={groupCount}
        programmes={programmes.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type as any,
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
