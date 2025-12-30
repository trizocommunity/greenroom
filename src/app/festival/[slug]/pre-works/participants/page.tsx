import { findFestivalBySlugOrId } from "@/server/models/festival.model";
import { notFound } from "next/navigation";
import { ParticipantsClient } from "@/components/festival/pre-works/participants/ParticipantsClient";
import { getSession } from "@/lib/auth/session";
import { findMemberByFestivalAndUser } from "@/server/models/member.model";
import { prisma } from "@/lib/db";

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalSlug } = await params;
  const festival = await findFestivalBySlugOrId(festivalSlug);

  if (!festival) {
    notFound();
  }

  // Fetch current user member role
  const session = await getSession();
  const member = session?.userId
    ? await findMemberByFestivalAndUser(festival.id, session.userId)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Participants</h2>
        <p className="text-muted-foreground">
          Manage participants for{" "}
          <span className="font-semibold text-foreground">{festival.name}</span>
        </p>
      </div>

      <ParticipantsClient festivalId={festival.id} />
    </div>
  );
}
