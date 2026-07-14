"use client";

import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PosterTemplateType } from "./poster-editor-config";
import { TEMPLATE_TYPES } from "./poster-editor-config";

import { openTemplateBackgroundPicker } from "./template-background-picker";

export function NewTemplateModal({
  open,

  onOpenChange,

  onPick,
}: {
  open: boolean;

  onOpenChange: (open: boolean) => void;

  onPick: (
    type: PosterTemplateType,

    mode: "blank" | "background" | "teams",

    backgroundImageUrl?: string,
  ) => void;
}) {
  const pickWithBackground = (
    type: PosterTemplateType,

    mode: "background",
  ) => {
    openTemplateBackgroundPicker((url) => {
      onPick(type, mode, url);

      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            Start a new template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {TEMPLATE_TYPES.map((t) => (
            <div
              key={t.type}
              className="rounded-xl border bg-card p-4 shadow-sm"
            >
              <p className="font-semibold">
                {t.emoji} {t.title}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {t.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {t.type === "RESULT" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onPick("RESULT", "blank");

                        onOpenChange(false);
                      }}
                    >
                      + Blank
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => pickWithBackground("RESULT", "background")}
                    >
                      <Upload className="mr-1.5 h-4 w-4" />
                      With background
                    </Button>
                  </>
                ) : t.type === "TEAM_POINTS" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onPick("TEAM_POINTS", "teams");

                      onOpenChange(false);
                    }}
                  >
                    + Create
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onPick("CANDIDATE_CARD", "blank");

                        onOpenChange(false);
                      }}
                    >
                      + Blank
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        pickWithBackground("CANDIDATE_CARD", "background")
                      }
                    >
                      <Upload className="mr-1.5 h-4 w-4" />
                      With background
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
