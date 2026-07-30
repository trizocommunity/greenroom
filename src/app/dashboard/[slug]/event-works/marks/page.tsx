import { asc, desc, eq } from "drizzle-orm";
import { ClipboardList, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { BasicMarksClient } from "@/components/dashboard/marks/BasicMarksClient";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  programme as programmeTable,
} from "@/core/database/schema";
import { getScoringPolicyAction } from "@/features/judgement/actions/judgement.actions";
import { getEffectiveFeatureTagEnabled } from "@/features/plan-features/services/plan-features-tags.service";
import {
  getResolvedTier,
  isBasicTier,
} from "@/features/plan-features/services/tier";
import {
  filterProgrammesForEventWorks,
  type ProgrammeStatus,
  syncStaleBasicProgrammeStatuses,
  type Tier,
} from "@/features/programmes/services/programme-status.service";
import { enrichProgrammesAssignmentsResultCodeLetters } from "@/features/results/services/results.service";

export const metadata: Metadata = {
  title: "Scoring",
};

export default async function MarksRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, slug),
    with: {
      categories: { orderBy: [asc(festivalTable.name)] },
      programmes: {
        with: {
          category: true,
          assignments: {
            with: {
              participant: true,
              group: true,
              result: true,
            },
          },
        },
        orderBy: [desc(programmeTable.createdAt)],
      },
    },
  });

  if (!festival) {
    return notFound();
  }

  const tier = getResolvedTier(festival.tier) as Tier;

  if (!isBasicTier(tier)) {
    redirect(`/dashboard/${slug}/event-works/judgement`);
  }

  const canUseMarks = await getEffectiveFeatureTagEnabled(
    tier,
    "eventWorks.marksUI",
  );
  if (!canUseMarks) {
    return notFound();
  }

  const policy = await getScoringPolicyAction(festival.id);
  if (!policy.isPersisted) {
    return (
      <EmptyState
        title="Set up scoring policy first"
        description="Save your grade rules and award points on the Scoring Policy page before entering scores."
        actionLabel="Open Scoring Policy"
        actionLink={`/dashboard/${slug}/event-works/scoring`}
        icon={ListChecks}
      />
    );
  }

  await syncStaleBasicProgrammeStatuses(
    festival.programmes as {
      id: string;
      status: ProgrammeStatus;
      assignments?: readonly unknown[];
    }[],
    tier,
  );

  const eventWorksProgrammes = filterProgrammesForEventWorks(
    festival.programmes as any,
    tier,
  );

  const totalProgrammes = festival.programmes.length;
  const totalAssignmentsOnFestival = festival.programmes.reduce(
    (sum, p) => sum + (p.assignments?.length ?? 0),
    0,
  );

  if (eventWorksProgrammes.length === 0) {
    if (totalProgrammes === 0) {
      return (
        <EmptyState
          title="No Programmes Found"
          description="Create programmes in Pre Event Works before entering scores."
          actionLabel="Create Programmes"
          actionLink={`/dashboard/${slug}/pre-event-works/programmes`}
          icon={ClipboardList}
        />
      );
    }

    if (totalAssignmentsOnFestival === 0) {
      return (
        <EmptyState
          title="No Assignments Found"
          description="Assign participants to programmes in Pre Event Works before entering scores."
          actionLabel="Go to Assignments"
          actionLink={`/dashboard/${slug}/pre-event-works/assignments`}
          icon={ClipboardList}
        />
      );
    }

    return (
      <EmptyState
        title="Programmes Not Ready for Scoring"
        description="Assignments exist but programme status could not be updated. Open Assignments and save again, or contact support if this persists."
        actionLabel="Go to Assignments"
        actionLink={`/dashboard/${slug}/pre-event-works/assignments`}
        icon={ClipboardList}
      />
    );
  }

  await enrichProgrammesAssignmentsResultCodeLetters(
    eventWorksProgrammes as any,
  );

  return (
    <div className="pt-4 sm:pt-6">
      <BasicMarksClient
        festival={{
          id: festival.id,
          slug: festival.slug,
          name: festival.name,
        }}
        programmes={eventWorksProgrammes}
        categories={festival.categories}
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Scoring
        </h1>
      </BasicMarksClient>
    </div>
  );
}
