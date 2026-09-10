import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { CheckpointsLanding } from "@/features/checkpoints/components/CheckpointsLanding";
import { getCheckpointsPageData } from "@/features/checkpoints/services/checkpoint.service";
import { getFestivalContext } from "@/features/festivals/services/festival-context.service";

export const metadata: Metadata = {
  title: "Checkpoints | Greenroom",
  description: "Scan participants for attendance, food, and custom checkpoints",
};

export default async function CheckpointsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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

  const { checkpoints, todayString } = await getCheckpointsPageData(
    context.festival.id,
    { name: session.name, email: session.email },
  );

  return (
    <div className="pt-4 sm:pt-6 space-y-4">
      <CheckpointsLanding
        festivalId={context.festival.id}
        basePath={`/dashboard/${slug}/event-works/checkpoints`}
        todayString={todayString}
        checkpoints={checkpoints}
      />
    </div>
  );
}
