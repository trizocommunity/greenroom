"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useStagePortalScorePayload } from "@/api/client/server-actions";
import { StagePortalScoringClient } from "@/components/judge/StagePortalScoringClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export function StagePortalScorePageClient({
  configId,
  festivalSlug,
}: {
  configId: string;
  festivalSlug: string;
}) {
  const router = useRouter();
  // Once the judge has submitted, stop polling so the "no longer live" error
  // doesn't trigger the session-unavailable modal after a successful submission.
  const [submitted, setSubmitted] = useState(false);
  const { data, isLoading, error } = useStagePortalScorePayload(
    submitted ? "" : configId,
  );

  // Keep the last known payload so the scoring client can render its summary
  // after submission even though the query has been disabled.
  const lastPayloadRef = useRef(data?.payload);
  if (data?.payload) {
    lastPayloadRef.current = data.payload;
  }
  const payload = data?.payload ?? lastPayloadRef.current;

  if (isLoading && !submitted) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
        <Skeleton className="h-12 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!submitted && (error || !data)) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
        <AlertDialog open={true} onOpenChange={() => {}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Session Unavailable</AlertDialogTitle>
              <AlertDialogDescription>
                {error?.message ??
                  "Judgement round not found or no longer live. It may have been cancelled by an administrator."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/${festivalSlug}/stage-portal`);
                }}
              >
                Return to Portal
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <StagePortalScoringClient
        stageName={data?.stageName ?? ""}
        payload={payload ?? ({} as any)}
        onDone={() => {
          router.push(`/${festivalSlug}/stage-portal`);
        }}
        onSubmitted={() => setSubmitted(true)}
      />
    </div>
  );
}
