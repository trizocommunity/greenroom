"use client";

import { RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";
import type { ResetTemplateConfig } from "@/components/editor/PosterEditorPlayground";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { editorBtnSm } from "./editor-chrome";
import type { PosterEditorState } from "./use-poster-editor-state";

function ResetButton({
  resetting,
  onClick,
}: {
  resetting?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={editorBtnSm}
      title="Reset template to factory layout"
      disabled={resetting}
      onClick={onClick}
    >
      <RotateCcw className="h-3.5 w-3.5" />
      Reset
    </Button>
  );
}

export function EditorHeaderActions({
  editor,
  previewDataHint,
  resetTemplate,
}: {
  editor: PosterEditorState;
  previewDataHint?: string | null;
  resetTemplate?: ResetTemplateConfig;
}) {
  const { doc, previewMode, setPreviewMode, resetDocument } = editor;
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, startResetTransition] = useTransition();

  if (!doc) return null;

  const handleFestivalReset = () => {
    if (!resetTemplate) return;
    startResetTransition(async () => {
      resetDocument();
      await resetTemplate.onAfterReset?.();
      setResetOpen(false);
    });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="hidden items-center gap-2 lg:flex">
        <div className="flex max-w-[220px] flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Switch
              id="preview-data"
              checked={previewMode}
              onCheckedChange={setPreviewMode}
              className="scale-90"
            />
            {previewDataHint ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label
                    htmlFor="preview-data"
                    className="cursor-help text-[11px] text-muted-foreground underline decoration-dotted underline-offset-2"
                  >
                    Preview data
                  </Label>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {previewDataHint}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Label
                htmlFor="preview-data"
                className="text-[11px] text-muted-foreground"
              >
                Preview data
              </Label>
            )}
          </div>
          {previewDataHint && previewMode && (
            <p className="pl-9 text-[9px] leading-tight text-amber-600/90">
              Placeholder names
            </p>
          )}
        </div>

        {resetTemplate ? (
          <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
            <AlertDialogTrigger asChild>
              <ResetButton resetting={resetting} />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Reset {resetTemplate.templateCode}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Unsaved changes will be discarded. The canvas returns to the
                  factory default layout — not your last saved draft. Save first
                  if you need to keep the current design.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={resetting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={resetting}
                  onClick={(e) => {
                    e.preventDefault();
                    handleFestivalReset();
                  }}
                >
                  {resetting ? "Resetting…" : "Reset"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <ResetButton onClick={() => resetDocument()} />
        )}
      </div>
    </TooltipProvider>
  );
}
