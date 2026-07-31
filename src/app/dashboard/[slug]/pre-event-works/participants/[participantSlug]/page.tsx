import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ParticipantProfileView } from "@/components/festival/pre-event-works/participants/ParticipantProfileView";
import { APP_URL } from "@/config/routes";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { parseInstant } from "@/core/datetime";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { findParticipantByFestivalAndProfileSlug } from "@/features/participants/repositories/participant.repository";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; participantSlug: string }>;
}): Promise<Metadata> {
  const { slug, participantSlug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return { title: "Participant" };
  const participant = await findParticipantByFestivalAndProfileSlug(
    festival.id,
    participantSlug,
  );
  if (!participant) return { title: "Participant" };
  return {
    title: `${participant.name} – Participant profile`,
  };
}

/** Async content in a separate component so the page default export stays sync (avoids Turbopack "CJS module can't be async"). */
async function ParticipantProfileContent({
  params,
}: {
  params: Promise<{ slug: string; participantSlug: string }>;
}) {
  const { slug, participantSlug } = await params;
  const session = await getSession();
  if (!session?.userId) notFound();

  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  await assertFestivalAccess(session, festival.id);

  const canViewProfile = FeatureService.isFeatureEnabled(
    getTierForFeatureCheck(festival.tier),
    "viewParticipantProfile",
  );
  if (!canViewProfile) notFound();

  const participant = await findParticipantByFestivalAndProfileSlug(
    festival.id,
    participantSlug,
  );
  if (!participant) notFound();

  const baseUrl = APP_URL.replace(/\/$/, "");

  return (
    <ParticipantProfileView
      participant={{
        ...participant,
        createdAt: parseInstant(participant.createdAt) ?? new Date(NaN),
        updatedAt: parseInstant(participant.updatedAt) ?? new Date(NaN),
        assignments: participant.assignments ?? [],
      }}
      festivalId={festival.id}
      festivalSlug={festival.slug}
      baseUrl={baseUrl}
    />
  );
}

export default function ParticipantProfilePage({
  params,
}: {
  params: Promise<{ slug: string; participantSlug: string }>;
}) {
  return <ParticipantProfileContent params={params} />;
}
