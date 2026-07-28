import { redirect } from "next/navigation";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { findParticipantByFestivalAndProfileSlug } from "@/features/participants/repositories/participant.repository";
import { getParticipantSessionFromCookie } from "./participant-session";

export type ParticipantAuthContext = {
  session: NonNullable<
    Awaited<ReturnType<typeof getParticipantSessionFromCookie>>
  >;
  participant: NonNullable<
    Awaited<ReturnType<typeof findParticipantByFestivalAndProfileSlug>>
  >;
  festival: NonNullable<Awaited<ReturnType<typeof findFestivalBySlug>>>;
};

export async function requireParticipantAuth(
  festivalSlug: string,
  participantSlug: string,
  requireTeamLeader: boolean = false,
): Promise<ParticipantAuthContext> {
  const session = await getParticipantSessionFromCookie();

  if (!session) {
    redirect(`/${festivalSlug}/login`);
  }

  if (session.festival.slug !== festivalSlug) {
    redirect(`/${festivalSlug}/login`);
  }

  if (session.participant.profileSlug !== participantSlug) {
    redirect(`/${festivalSlug}/login`);
  }

  const festival = await findFestivalBySlug(festivalSlug);
  if (!festival) {
    redirect(`/${festivalSlug}/login`);
  }

  const participant = await findParticipantByFestivalAndProfileSlug(
    festival.id,
    participantSlug,
  );
  if (!participant) {
    redirect(`/${festivalSlug}/login`);
  }

  if (requireTeamLeader && !participant.isTeamLeader) {
    redirect(`/${festivalSlug}/${participantSlug}`);
  }

  return { session, participant, festival };
}
