import { redirect } from "next/navigation";
import { getPublicFestivalStudentOrNotFound } from "@/core/auth/team-leader-guard";
import { getTeamLeaderSessionFromCookie } from "@/core/auth/team-leader-session";

export default async function TeamLeaderRootPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;
  const { festival, student } = await getPublicFestivalStudentOrNotFound(
    slug,
    studentSlug,
  );

  const session = await getTeamLeaderSessionFromCookie();
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
  redirect(`/${slug}/${studentSlug}/leader/login`);
}
