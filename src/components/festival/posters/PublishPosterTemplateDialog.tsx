"use client";

import type Konva from "konva";
import { useMemo, useRef } from "react";
import { MOCK_BINDINGS } from "@/components/editor/poster-editor-config";
import type { PosterEditorDocument } from "@/components/editor/poster-editor-types";
import { PosterExportCanvas } from "@/components/festival/posters/PosterExportCanvas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PosterBindings } from "@/features/posters/services/poster-bindings.service";

const PREVIEW_MAX_WIDTH = 520;
const PREVIEW_MAX_HEIGHT = 380;

function PosterTemplatePreview({
  doc,
  bindings,
}: {
  doc: PosterEditorDocument;
  bindings: PosterBindings;
}) {
  const stageRef = useRef<Konva.Stage | null>(null);

  const scale = useMemo(
    () =>
      Math.min(
        PREVIEW_MAX_WIDTH / doc.width,
        PREVIEW_MAX_HEIGHT / doc.height,
        1,
      ),
    [doc.width, doc.height],
  );

  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-lg bg-muted/20 p-4">
      <PosterExportCanvas
        doc={doc}
        bindings={bindings}
        stageRef={stageRef}
        scale={scale}
        inline
      />
    </div>
  );
}

export function PublishPosterTemplateDialog({
  open,
  onOpenChange,
  document,
  templateCode,
  onConfirm,
  loading,
  previewBindings,
  previewPlaceholderHint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: PosterEditorDocument;
  templateCode: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  previewBindings?: PosterBindings;
  previewPlaceholderHint?: string;
}) {
  const bindings = previewBindings ?? (MOCK_BINDINGS as PosterBindings);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Publish {templateCode}?</DialogTitle>
          <DialogDescription>
            Preview how the poster will look with sample data. Publishing makes
            this template available for programmes and results.
          </DialogDescription>
        </DialogHeader>

        <PosterTemplatePreview doc={document} bindings={bindings} />

        <p className="text-center text-[11px] text-muted-foreground">
          {previewPlaceholderHint
            ? previewPlaceholderHint
            : previewBindings
              ? "Preview uses live data from this festival"
              : "Preview uses generic sample data"}{" "}
          · {document.width}×{document.height} px
        </p>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            {loading ? "Publishing…" : "Confirm publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
