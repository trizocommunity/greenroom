import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScoringPolicyClient } from "@/components/dashboard/judgment/ScoringPolicyClient";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  festival as festivalTable,
  programme as programmeTable,
} from "@/core/database/schema";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";
import { getScoringPolicyAction } from "@/features/judgment/actions/judgment.actions";
import { isBasicTier } from "@/features/plan-features/services/tier";

export const metadata: Metadata = {
  title: "Scoring Policy",
};

export default async function ScoringPolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, slug),
    columns: { id: true, name: true, slug: true, tier: true },
  });
  if (!festival) return notFound();

  const session = await getSession();
  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session?.userId ?? null,
    globalRole: session?.role ?? null,
  });
  if (!context) return notFound();
  if (
    !["OWNER", "ADMIN", "STAGE_MANAGER", "SUPER_ADMIN"].includes(context.role)
  ) {
    return notFound();
  }

  const [policy, categories, programmes] = await Promise.all([
    getScoringPolicyAction(festival.id),
    db.query.category.findMany({
      where: eq(categoryTable.festivalId, festival.id),
      columns: { id: true, name: true },
      orderBy: [asc(categoryTable.name)],
    }),
    db.query.programme.findMany({
      where: eq(programmeTable.festivalId, festival.id),
      columns: { id: true, name: true, categoryId: true },
      orderBy: [asc(programmeTable.name)],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Scoring Policy
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Configure grade rules and award points for{" "}
          {isBasicTier(festival.tier)
            ? "Basic plan scoring (required before entering marks)."
            : "Standard and Pro judging."}
        </p>
      </div>
      <ScoringPolicyClient
        festivalId={festival.id}
        policy={policy}
        categories={categories}
        programmes={programmes}
      />
    </div>
  );
}
