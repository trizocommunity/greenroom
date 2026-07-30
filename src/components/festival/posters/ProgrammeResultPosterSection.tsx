"use client";

import { useEffect, useState } from "react";
import { ResultPosterActions } from "@/components/festival/posters/ResultPosterActions";
import {
  getResultPosterExportPayloadAction,
  type ResultPosterExportPayload,
} from "@/features/posters/actions/poster-export.actions";

export function ProgrammeResultPosterSection({
  programmeId,
  festivalSlug,
  canSwap,
  isPublished,
}: {
  programmeId: string;
  festivalSlug: string;
  canSwap: boolean;
  isPublished: boolean;
}) {
  const [payload, setPayload] = useState<ResultPosterExportPayload | null>(
    null,
  );

  useEffect(() => {
    if (!isPublished) {
      setPayload(null);
      return;
    }
    let cancelled = false;
    void getResultPosterExportPayloadAction(programmeId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setPayload(res.data);
      else setPayload(null);
    });
    return () => {
      cancelled = true;
    };
  }, [programmeId, isPublished]);

  if (!payload) return null;

  return (
    <ResultPosterActions
      payload={payload}
      festivalSlug={festivalSlug}
      canSwap={canSwap}
    />
  );
}
