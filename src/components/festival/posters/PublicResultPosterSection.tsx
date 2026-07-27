"use client";

import { useEffect, useState } from "react";
import { ResultPosterActions } from "@/components/festival/posters/ResultPosterActions";
import {
  getPublicResultPosterPayloadAction,
  type ResultPosterExportPayload,
} from "@/features/posters/actions/poster-export.actions";

export function PublicResultPosterSection({
  programmeId,
  festivalSlug,
  initialTemplateCode,
}: {
  programmeId: string;
  festivalSlug: string;
  initialTemplateCode?: string;
}) {
  const [payload, setPayload] = useState<ResultPosterExportPayload | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void getPublicResultPosterPayloadAction(programmeId, festivalSlug).then(
      (res) => {
        if (cancelled) return;
        if (res.success && res.data) setPayload(res.data);
        else setPayload(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [programmeId, festivalSlug]);

  if (!payload) return null;

  return (
    <div className="mt-4">
      <ResultPosterActions
        payload={payload}
        festivalSlug={festivalSlug}
        canSwap
        publicMode
        initialTemplateCode={initialTemplateCode}
      />
    </div>
  );
}
