import { redirect } from "next/navigation";
import { getParticipantSessionFromCookie } from "@/core/auth/participant-session";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { findStudentByFestivalAndProfileSlug } from "@/features/students/repositories/student.repository";

export default async function TeamLeaderRootPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;

  const festival = await findFestivalBySlug(slug);
  if (!festival) redirect(`/${slug}/login`);

  const student = await findStudentByFestivalAndProfileSlug(
    festival.id,
    studentSlug,
  );
  if (!student?.isTeamLeader) redirect(`/${slug}/login`);

  const session = await getParticipantSessionFromCookie();
  const isValidSession =
    Boolean(session) &&
    !session?.revokedAt &&
    session?.expiresAt &&
    new Date(session.expiresAt) > new Date() &&
    session?.studentId === student.id &&
    session?.festivalId === festival.id &&
    session?.student?.isTeamLeader;

  if (isValidSession) {
    redirect(`/${slug}/${studentSlug}/leader/dashboard`);
  }
  redirect(`/${slug}/login`);
}
