"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { PublishResultTemplateDialog } from "@/components/festival/posters/PublishResultTemplateDialog";
import { getPublishedResultTemplatesAction } from "@/features/posters/actions/poster-template.actions";
import { bulkPublishProgrammeResults } from "@/features/results/actions/results.actions";

export function usePublishProgrammeWithPoster({
  festivalId,
  festivalSlug,
  onSuccess,
}: {
  festivalId: string;
  festivalSlug: string;
  onSuccess?: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingProgrammeId, setPendingProgrammeId] = useState<string | null>(
    null,
  );
  const [publishedCodes, setPublishedCodes] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const runPublish = useCallback(
    (programmeId: string, templateCode?: string | null) => {
      startTransition(async () => {
        const res = await bulkPublishProgrammeResults(
          programmeId,
          true,
          festivalSlug,
          templateCode ?? undefined,
        );
        if (res.success) {
          toast.success("Programme results published.");
          setDialogOpen(false);
          setPendingProgrammeId(null);
          onSuccess?.();
        } else {
          toast.error(res.error);
        }
      });
    },
    [festivalSlug, onSuccess],
  );

  const requestPublish = useCallback(
    async (programmeId: string) => {
      const templatesRes = await getPublishedResultTemplatesAction(festivalId);
      const codes =
        templatesRes.success && templatesRes.data.length > 0
          ? templatesRes.data.map((t) => t.code)
          : [];

      if (codes.length === 0) {
        startTransition(async () => {
          const res = await bulkPublishProgrammeResults(
            programmeId,
            true,
            festivalSlug,
          );
          if (res.success) {
            toast.success("Programme results published.");
            onSuccess?.();
          } else toast.error(res.error);
        });
        return;
      }

      setPublishedCodes(codes);
      setPendingProgrammeId(programmeId);
      setDialogOpen(true);
    },
    [festivalId, festivalSlug, onSuccess],
  );

  const dialog = (
    <PublishResultTemplateDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      publishedCodes={publishedCodes}
      loading={pending}
      onConfirm={(code) => {
        if (pendingProgrammeId) runPublish(pendingProgrammeId, code);
      }}
    />
  );

  return { requestPublish, dialog, pending };
}
