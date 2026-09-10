import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { CheckpointSessionsClient } from "@/features/checkpoints/components/CheckpointSessionsClient";
import { getCheckpointDetailData } from "@/features/checkpoints/services/checkpoint.service";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";

export const metadata: Metadata = {
  title: "Checkpoint | Greenroom",
  description: "Scan participants and review attendance for this checkpoint",
};

export default async function CheckpointDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; checkpointId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { slug, checkpointId } = await params;
  const { session: openSessionId } = await searchParams;
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const context = await getFestivalContext({
    slugOrId: slug,
    userId: session.userId,
    globalRole: session.role,
  });

  if (!context) {
    notFound();
  }

  if (!["ADMIN", "OWNER", "VOLUNTEER"].includes(context.role)) {
    redirect(`/dashboard/${slug}`);
  }

  const data = await getCheckpointDetailData(context.festival.id, checkpointId);

  if (!data) {
    notFound();
  }

  return (
    <div className="pt-4 sm:pt-6 space-y-4">
      <CheckpointSessionsClient
        festivalId={context.festival.id}
        basePath={`/dashboard/${slug}/event-works/checkpoints`}
        checkpoint={data.checkpoint}
        initialSessions={data.sessions}
        dates={data.dates}
        filters={data.filters}
        todayString={data.todayString}
        openSessionId={openSessionId}
      />
    </div>
  );
}
