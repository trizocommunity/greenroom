import { notFound } from "next/navigation";
import { APP_CONTAINER } from "@/components/app/AppSection";
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
    <div className={`${APP_CONTAINER} py-8`}>
      <ProgrammeNotificationsClient
        participantId={participant.id}
        festivalId={festival.id}
      />
    </div>
  );
}
