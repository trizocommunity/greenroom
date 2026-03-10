import { notFound } from "next/navigation";
import { AssignmentsClient } from "@/components/festival/pre-works/assignments/AssignmentsClient";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/common/EmptyState";
import { CalendarRange, Users } from "lucide-react";

export default async function AssignmentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  // Check for programmes
  const programmeCount = await prisma.programme.count({
    where: { festivalId: festival.id },
  });

  if (programmeCount === 0) {
    return (
      <EmptyState
        title="No Programmes Found"
        description="You need to create programmes before you can assign students."
        actionLabel="Create Programmes"
        actionLink={`/dashboard/${festival.slug}/pre-works/programmes`}
        icon={CalendarRange}
      />
    );
  }

  // Check for students
  const studentCount = await prisma.student.count({
    where: { festivalId: festival.id },
  });

  if (studentCount === 0) {
    return (
      <EmptyState
        title="No Students Found"
        description="You need to create students before you can assign them to programmes."
        actionLabel="Create Students"
        actionLink={`/dashboard/${festival.slug}/pre-works/students`}
        icon={Users}
      />
    );
  }

  return (
    <div className="pt-4 sm:pt-6">
      <AssignmentsClient
        festivalId={festival.id}
        programmeAssignmentDeadline={festival.programmeAssignmentDeadline}
      >
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Programme Assignments
          </h1>
      </AssignmentsClient>
    </div>
  );
}
