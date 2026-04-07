import type { ProgrammeStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import { StudentNavbar } from "@/components/student/StudentNavbar";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { getTopPriorityProgrammeStatus } from "@/lib/programme-status-priority";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { findStudentByFestivalAndProfileSlug } from "@/server/models/student.model";

const RESERVED_SLUGS = new Set([
  "results",
  "gallery",
  "news",
  "programmes",
  "sessions",
  "about",
]);

export default async function StudentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string; studentSlug: string }>;
}) {
  const { slug, studentSlug } = await params;

  if (RESERVED_SLUGS.has(studentSlug)) notFound();

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

  const logo =
    festival.branding &&
    typeof festival.branding === "object" &&
    "logo" in festival.branding
      ? (festival.branding as any).logo
      : null;

  const heroImage =
    festival.branding &&
    typeof festival.branding === "object" &&
    "heroImage" in festival.branding
      ? (festival.branding as any).heroImage
      : null;

  const festivalProviderValue = {
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    description: festival.description ?? null,
    tagline: null,
    startDate: festival.startDate ? festival.startDate.toISOString() : null,
    endDate: festival.endDate ? festival.endDate.toISOString() : null,
    location: festival.location ?? null,
    status: festival.status,
    tier: festival.tier,
    logo,
    heroImage,
    orgName: festival.orgName ?? null,
    orgDescription: festival.orgDescription ?? null,
    orgWebsite: festival.orgWebsite ?? null,
    orgLocation: festival.orgLocation ?? null,
    establishedYear: festival.establishedYear ?? null,
    studentsCount: festival.studentsCount,
    programmesCount: festival.programmesCount,
    stagesCount: festival.stagesCount,
    limits: null,
    studentCreationDeadline: festival.studentCreationDeadline ?? null,
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline ?? null,
    effectiveFeatures: undefined,
  } as any;

  const statuses: ProgrammeStatus[] = (student.assignments ?? [])
    .map((a: any) => a.programme?.status)
    .filter(Boolean);

  const assignedProgrammesTopStatus = student.isTeamLeader
    ? null
    : (getTopPriorityProgrammeStatus(statuses) as ProgrammeStatus | null);

  return (
    <FestivalProvider festival={festivalProviderValue}>
      <div className="min-h-screen md:pt-10">
        <StudentNavbar
          festival={{
            slug: festival.slug ?? slug,
            name: festival.name,
          }}
          student={{
            isTeamLeader: Boolean(student.isTeamLeader),
            name: student.name,
          }}
          studentSlugParam={studentSlug}
          studentMainHref={
            student.isTeamLeader
              ? `/${festival.slug ?? slug}/${studentSlug}/leader`
              : `/${festival.slug ?? slug}/${studentSlug}`
          }
          assignedProgrammesTopStatus={assignedProgrammesTopStatus}
        />
        {children}
      </div>
    </FestivalProvider>
  );
}
