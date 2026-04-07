import type { Tier } from "@prisma/client";
import { Calendar } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { JudgmentClient } from "@/components/dashboard/judgment/JudgmentClient";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getFestivalContext } from "@/server/services/festival-context.service";
import { getEffectiveFeatureTagEnabled } from "@/server/services/plan-features-tags.service";
import { getProgrammeJudgingBoard } from "@/server/services/programme-judgment-board.service";

export const metadata: Metadata = {
  title: "Judgment",
};

export default async function JudgmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const festival = await prisma.festival.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, tier: true },
  });

  if (!festival) {
    return notFound();
  }

  const tier = (festival.tier ?? "STANDARD") as Tier;

  // Standard/Pro judging is tied to external judging UI capability.
  const canUseJudging = await getEffectiveFeatureTagEnabled(
    tier,
    "eventWorks.judgmentUI",
  );
  if (!canUseJudging) {
    // BASIC must not access this plan-based page.
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
    prisma.stage.findMany({
      where: { festivalId: festival.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
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
      festival={{ id: festival.id, slug: festival.slug, tier: festival.tier }}
      stages={board.stages}
      festivalStages={festivalStages}
      judgedProgrammes={board.judgedProgrammes}
    />
  );
}
