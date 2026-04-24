import { asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ScheduleClient } from "@/components/festival/pre-works/schedule/ScheduleClient";
import { db } from "@/core/database/client";
import { programme as programmeTable } from "@/core/database/schema";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getEffectiveFeatureEnabled } from "@/features/plan-features/services/plan-features.service";
import { getScheduleEntries } from "@/features/schedule/actions/schedule.actions";
import { getStages } from "@/features/stages/actions/stage.actions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SchedulePage({ params }: PageProps) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);

  if (!festival) {
    notFound();
  }

  const canManageSchedule = await getEffectiveFeatureEnabled(
    festival.tier as any,
    "schedule",
  );
  if (!canManageSchedule) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=schedule`);
  }

  const [entries, stages, allProgrammes] = await Promise.all([
    getScheduleEntries(festival.id),
    getStages(festival.id),
    db.query.programme.findMany({
      where: eq(programmeTable.festivalId, festival.id),
      with: {
        category: {
          columns: { id: true, name: true },
        },
      },
      columns: { id: true, name: true },
      orderBy: [asc(programmeTable.name)],
    }),
  ]);

  const scheduledProgrammeIds = new Set(
    entries
      .filter((e) => e.type === "PROGRAMME" && e.programmeId)
      .map((e) => e.programmeId!),
  );
  const programmes = allProgrammes
    .filter((p) => !scheduledProgrammeIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      categoryId: p.category?.id ?? null,
      categoryName: p.category?.name ?? null,
    }));

  return (
    <div className="container pt-4 sm:pt-6">
      <ScheduleClient
        festivalId={festival.id}
        initialEntries={entries as any}
        programmes={programmes}
        stages={stages.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description ?? null,
        }))}
        festivalStartDate={festival.startDate}
        festivalEndDate={festival.endDate}
      />
    </div>
  );
}
