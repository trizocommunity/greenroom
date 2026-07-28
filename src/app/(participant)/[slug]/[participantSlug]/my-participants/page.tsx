import { and, asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MyParticipantsClient } from "@/components/participant/team-leader/MyParticipantsClient";
import { requireParticipantAuth } from "@/core/auth/participant-guard";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  participant as participantTable,
} from "@/core/database/schema";

export default async function MyParticipantsPage({
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

  const [groupParticipants, categories] = await Promise.all([
    db.query.participant.findMany({
      where: and(
        eq(participantTable.festivalId, festival.id),
        eq(participantTable.groupId, participant.groupId!),
      ),
      with: { group: true, category: true },
      orderBy: [desc(participantTable.createdAt)],
    }),
    db.query.category.findMany({
      where: eq(categoryTable.festivalId, festival.id),
      columns: { id: true, name: true, type: true },
      orderBy: [asc(categoryTable.name)],
    }),
  ]);

  const deadline = festival.participantCreationDeadline;
  const isReadOnly = deadline ? new Date() > new Date(deadline) : false;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <MyParticipantsClient
        festivalId={festival.id}
        festivalSlug={festival.slug}
        participants={groupParticipants as any[]}
        allCategories={categories
          .filter((c) => c.type === "SINGLE")
          .map((c) => ({ id: c.id, name: c.name }))}
        deadline={deadline}
        isReadOnly={isReadOnly}
      />
    </div>
  );
}
