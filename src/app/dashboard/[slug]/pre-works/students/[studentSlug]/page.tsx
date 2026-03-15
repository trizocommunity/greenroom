import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { APP_URL } from "@/config/routes";
import { findFestivalBySlug } from "@/server/models/festival.model";
import {
  findStudentByFestivalAndProfileSlug,
  findStudentByFestivalAndId,
} from "@/server/models/student.model";
import { StudentProfileView } from "@/components/festival/pre-works/students/StudentProfileView";

/** UUID v4 pattern – allow legacy links with student id */
function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}): Promise<Metadata> {
  const { slug, studentSlug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return { title: "Student" };
  const student = looksLikeUuid(studentSlug)
    ? await findStudentByFestivalAndId(festival.id, studentSlug)
    : await findStudentByFestivalAndProfileSlug(festival.id, studentSlug);
  if (!student) return { title: "Student" };
  return {
    title: `${student.name} – Student profile`,
  };
}

/** Async content in a separate component so the page default export stays sync (avoids Turbopack "CJS module can't be async"). */
async function StudentProfileContent({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;
  const session = await getSession();
  if (!session?.userId) notFound();

  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  await assertFestivalAccess(session, festival.id);

  const canViewProfile = FeatureService.isFeatureEnabled(
    getTierForFeatureCheck(festival.tier),
    "viewStudentProfile",
  );
  if (!canViewProfile) notFound();

  const student = looksLikeUuid(studentSlug)
    ? await findStudentByFestivalAndId(festival.id, studentSlug)
    : await findStudentByFestivalAndProfileSlug(festival.id, studentSlug);
  if (!student) notFound();

  const baseUrl = APP_URL.replace(/\/$/, "");

  return (
    <StudentProfileView
      student={{
        ...student,
        assignments: student.assignments ?? [],
      }}
      festivalId={festival.id}
      festivalSlug={festival.slug}
      baseUrl={baseUrl}
    />
  );
}

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  return <StudentProfileContent params={params} />;
}
