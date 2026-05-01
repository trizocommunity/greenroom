import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentProfileView } from "@/components/festival/pre-works/students/StudentProfileView";
import { APP_URL } from "@/config/routes";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";
import { findStudentByFestivalAndProfileSlug } from "@/features/students/repositories/student.repository";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; studentSlug: string }>;
}): Promise<Metadata> {
  const { slug, studentSlug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return { title: "Student" };
  const student = await findStudentByFestivalAndProfileSlug(
    festival.id,
    studentSlug,
  );
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

  const student = await findStudentByFestivalAndProfileSlug(
    festival.id,
    studentSlug,
  );
  if (!student) notFound();

  const baseUrl = APP_URL.replace(/\/$/, "");

  return (
    <StudentProfileView
      student={{
        ...student,
        createdAt: new Date(student.createdAt),
        updatedAt: new Date(student.updatedAt),
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
