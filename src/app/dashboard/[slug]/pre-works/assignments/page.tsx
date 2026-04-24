import { count, eq } from "drizzle-orm";
import { CalendarRange, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { AssignmentsClient } from "@/components/festival/pre-works/assignments/AssignmentsClient";
import { db } from "@/core/database/client";
import {
  programme as programmeTable,
  student as studentTable,
} from "@/core/database/schema";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";

export default async function AssignmentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  // Check for programmes
  const [programmeCountResult] = await db
    .select({ c: count() })
    .from(programmeTable)
    .where(eq(programmeTable.festivalId, festival.id));

  if (programmeCountResult.c === 0) {
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
  const [studentCountResult] = await db
    .select({ c: count() })
    .from(studentTable)
    .where(eq(studentTable.festivalId, festival.id));

  if (studentCountResult.c === 0) {
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
        programmeAssignmentDeadline={festival.programmeAssignmentDeadline ? new Date(festival.programmeAssignmentDeadline) : null}
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Programme Assignments
        </h1>
      </AssignmentsClient>
    </div>
  );
}
