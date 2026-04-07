import { notFound, redirect } from "next/navigation";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { getTeamLeaderSessionFromCookie } from "@/lib/team-leader-auth/session";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { findStudentByFestivalAndProfileSlug } from "@/server/models/student.model";

export async function getPublicFestivalStudentOrNotFound(
  slug: string,
  studentSlug: string,
) {
  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const canViewProfile = FeatureService.isFeatureEnabled(
    getTierForFeatureCheck(festival.tier),
    "publicStudentProfile",
  );
  if (!canViewProfile) notFound();

  const student = await findStudentByFestivalAndProfileSlug(
    festival.id,
    studentSlug,
  );
  if (!student) notFound();

  return { festival, student };
}

export async function requireTeamLeaderSession(params: {
  slug: string;
  studentSlug: string;
}) {
  const { festival, student } = await getPublicFestivalStudentOrNotFound(
    params.slug,
    params.studentSlug,
  );

  if (!student.isTeamLeader) notFound();

  const session = await getTeamLeaderSessionFromCookie();
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    !session.student?.isTeamLeader ||
    session.studentId !== student.id ||
    session.festivalId !== festival.id
  ) {
    redirect(`/${festival.slug}/${params.studentSlug}/leader/login`);
  }

  return { festival, student, session };
}
