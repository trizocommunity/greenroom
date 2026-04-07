import { notFound, redirect } from "next/navigation";
import { ScheduleClient } from "@/components/festival/pre-works/schedule/ScheduleClient";
import { prisma } from "@/lib/db";
import { getScheduleEntries } from "@/server/actions/schedule.actions";
import { getStages } from "@/server/actions/stage.actions";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";

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
    festival.tier,
    "schedule",
  );
  if (!canManageSchedule) {
    redirect(`/dashboard/${slug}?error=upgrade_required&feature=schedule`);
  }

  const [entries, stages, allProgrammes] = await Promise.all([
    getScheduleEntries(festival.id),
    getStages(festival.id),
    prisma.programme.findMany({
      where: { festivalId: festival.id },
      select: {
        id: true,
        name: true,
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: "asc" },
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
        initialEntries={entries}
        programmes={programmes}
        stages={stages.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description ?? null,
        }))}
        festivalStartDate={festival.startDate?.toISOString() ?? null}
        festivalEndDate={festival.endDate?.toISOString() ?? null}
      />
    </div>
  );
}
