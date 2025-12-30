import { notFound } from "next/navigation";
import { AssignmentsClient } from "@/components/festival/pre-works/assignments/AssignmentsClient";
import { DeadlinesCard } from "@/components/festival/pre-works/DeadlinesCard";
import { findFestivalBySlug } from "@/server/models/festival.model";

export default async function AssignmentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Programme Assignments
          </h1>
          <p className="text-muted-foreground">
            Manage participant assignments to programmes.
          </p>
        </div>
        <DeadlinesCard />
      </div>
      <AssignmentsClient
        festivalId={festival.id}
        programmeAssignmentDeadline={festival.programmeAssignmentDeadline}
      />
    </div>
  );
}
