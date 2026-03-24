import { redirect } from "next/navigation";
import { getTeamLeaderSessionFromCookie } from "@/lib/team-leader-auth/session";
import { getPublicFestivalStudentOrNotFound } from "@/lib/team-leader-auth/guard";

export default async function TeamLeaderRootPage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;
  const { festival, student } = await getPublicFestivalStudentOrNotFound(slug, studentSlug);

  const session = await getTeamLeaderSessionFromCookie();
  const isValidSession =
    Boolean(session) &&
    !session?.revokedAt &&
    session?.expiresAt &&
    session.expiresAt > new Date() &&
    session?.studentId === student.id &&
    session?.festivalId === festival.id &&
    session?.student?.isTeamLeader;

  if (isValidSession) {
    redirect(`/${slug}/${studentSlug}/leader/dashboard`);
  }
  redirect(`/${slug}/${studentSlug}/leader/login`);
}
