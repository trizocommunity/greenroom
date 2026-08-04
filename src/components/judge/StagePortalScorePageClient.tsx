"use client";

import { useRouter } from "next/navigation";
import { useStagePortalScorePayload } from "@/api/client/server-actions";
import { StagePortalScoringClient } from "@/components/judge/StagePortalScoringClient";
import { Skeleton } from "@/components/ui/skeleton";

export function StagePortalScorePageClient({
  configId,
  festivalSlug,
}: {
  configId: string;
  festivalSlug: string;
}) {
  const router = useRouter();
  const { data, isLoading, error } = useStagePortalScorePayload(configId);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
        <Skeleton className="h-12 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
        <p className="text-sm text-destructive">
          {error?.message ?? "Judgement round not found or no longer live."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <StagePortalScoringClient
        stageName={data.stageName}
        payload={data.payload}
        onDone={() => {
          router.push(`/${festivalSlug}/stage-portal`);
        }}
      />
    </div>
  );
}
