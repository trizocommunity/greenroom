import { notFound } from "next/navigation";
import { ProgrammeNotificationsClient } from "@/components/participant/ProgrammeNotificationsClient";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { findParticipantByFestivalAndProfileSlug } from "@/features/participants/repositories/participant.repository";

export default async function ParticipantNotificationsPage({
  params,
}: {
  params: Promise<{ slug: string; participantSlug: string }>;
}) {
  const { slug, participantSlug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const participant = await findParticipantByFestivalAndProfileSlug(
    festival.id,
    participantSlug,
  );
  if (!participant) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <ProgrammeNotificationsClient
        participantId={participant.id}
        festivalId={festival.id}
      />
    </div>
  );
}
