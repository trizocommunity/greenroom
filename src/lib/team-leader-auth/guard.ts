import { notFound, redirect } from "next/navigation";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { getTeamLeaderSessionFromCookie } from "@/lib/team-leader-auth/session";
import { findFestivalBySlug } from "@/server/models/festival.model";
import {
  findStudentByFestivalAndId,
  findStudentByFestivalAndProfileSlug,
} from "@/server/models/student.model";

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

export async function getPublicFestivalStudentOrNotFound(slug: string, studentSlug: string) {
  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  const canViewProfile = FeatureService.isFeatureEnabled(
    getTierForFeatureCheck(festival.tier),
    "publicStudentProfile",
  );
  if (!canViewProfile) notFound();

  const student = looksLikeUuid(studentSlug)
    ? await findStudentByFestivalAndId(festival.id, studentSlug)
    : await findStudentByFestivalAndProfileSlug(festival.id, studentSlug);
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
