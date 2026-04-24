import { notFound, redirect } from "next/navigation";
import { getTeamLeaderSessionFromCookie } from "@/core/auth/team-leader-session";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";
import { findStudentByFestivalAndProfileSlug } from "@/features/students/repositories/student.repository";

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
    new Date(session.expiresAt) <= new Date() ||
    !session.student?.isTeamLeader ||
    session.studentId !== student.id ||
    session.festivalId !== festival.id
  ) {
    redirect(`/${festival.slug}/${params.studentSlug}/leader/login`);
  }

  return { festival, student, session };
}
