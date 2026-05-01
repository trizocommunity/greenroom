import { asc, eq } from "drizzle-orm";
import { Calendar } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { JudgmentClient } from "@/components/dashboard/judgment/JudgmentClient";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  stage as stageTable,
} from "@/core/database/schema";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";
import { getProgrammeJudgingBoard } from "@/features/programmes/services/programme-judgment-board.service";

export const metadata: Metadata = {
  title: "Judgment",
};

export default async function JudgmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, slug),
    columns: { id: true, name: true, slug: true, tier: true },
  });

  if (!festival) {
    return notFound();
  }

  const tier = (festival.tier ?? "STANDARD") as any;

  const canUseJudging = await getEffectiveFeatureTagEnabled(
    tier,
    "eventWorks.judgmentUI",
  );
  if (!canUseJudging) {
    return notFound();
  }

  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });
  if (!context) return notFound();
  if (
    !["OWNER", "ADMIN", "STAGE_MANAGER", "SUPER_ADMIN"].includes(context.role)
  )
    return notFound();

  const [board, festivalStages] = await Promise.all([
    getProgrammeJudgingBoard(festival.id),
    db.query.stage.findMany({
      where: eq(stageTable.festivalId, festival.id),
      columns: { id: true, name: true },
      orderBy: [asc(stageTable.name)],
    }),
  ]);

  if (board.stages.length === 0 && board.judgedProgrammes.length === 0) {
    return (
      <EmptyState
        title="No programmes ready for judging"
        description="Once reporting ends and programmes become STARTED, you can create judge links here. After judges submit, programme history will appear below."
        actionLabel="Go to Schedule"
        actionLink={`/dashboard/${slug}/pre-works/schedule`}
        icon={Calendar}
      />
    );
  }

  return (
    <JudgmentClient
      festival={{
        id: festival.id,
        slug: festival.slug,
        tier: festival.tier as any,
      }}
      stages={board.stages as any}
      festivalStages={festivalStages}
      judgedProgrammes={board.judgedProgrammes as any}
    />
  );
}
