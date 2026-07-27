import { redirect } from "next/navigation";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { findStudentByFestivalAndProfileSlug } from "@/features/students/repositories/student.repository";
import { getParticipantSessionFromCookie } from "./participant-session";

export type ParticipantAuthContext = {
  session: NonNullable<
    Awaited<ReturnType<typeof getParticipantSessionFromCookie>>
  >;
  student: NonNullable<
    Awaited<ReturnType<typeof findStudentByFestivalAndProfileSlug>>
  >;
  festival: NonNullable<Awaited<ReturnType<typeof findFestivalBySlug>>>;
};

export async function requireParticipantAuth(
  festivalSlug: string,
  studentSlug: string,
  requireTeamLeader: boolean = false,
): Promise<ParticipantAuthContext> {
  const session = await getParticipantSessionFromCookie();

  if (!session) {
    redirect(`/${festivalSlug}/login`);
  }

  if (session.festival.slug !== festivalSlug) {
    redirect(`/${festivalSlug}/login`);
  }

  if (session.student.profileSlug !== studentSlug) {
    redirect(`/${festivalSlug}/login`);
  }

  const festival = await findFestivalBySlug(festivalSlug);
  if (!festival) {
    redirect(`/${festivalSlug}/login`);
  }

  const student = await findStudentByFestivalAndProfileSlug(
    festival.id,
    studentSlug,
  );
  if (!student) {
    redirect(`/${festivalSlug}/login`);
  }

  if (requireTeamLeader && !student.isTeamLeader) {
    redirect(`/${festivalSlug}/${studentSlug}`);
  }

  return { session, student, festival };
}
