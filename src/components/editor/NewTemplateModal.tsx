"use client";

import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { PosterTemplateType } from "./poster-editor-config";
import { TEMPLATE_TYPES } from "./poster-editor-config";
import { calculateAspectRatioDimensions } from "./poster-editor-presets";
import { openTemplateBackgroundPicker } from "./template-background-picker";

export function NewTemplateModal({
  open,
  onOpenChange,
  onPick,
  uploadImage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (
    type: PosterTemplateType,
    mode: "blank" | "background" | "teams",
    backgroundImageUrl?: string,
    width?: number,
    height?: number,
  ) => void;
  uploadImage?: (file: File) => Promise<string>;
}) {
  const pickWithBackground = (type: PosterTemplateType, mode: "background") => {
    openTemplateBackgroundPicker(async (info) => {
      let url = info.url;
      if (uploadImage) {
        try {
          url = await uploadImage(info.file);
        } catch {
          // Add toast if available or ignore, it will fallback to blob
        }
      }
      const dims = calculateAspectRatioDimensions(
        type,
        info.naturalWidth,
        info.naturalHeight,
      );
      onPick(type, mode, url, dims.width, dims.height);
      onOpenChange(false);
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-serif text-2xl">
            Start a new template
          </DrawerTitle>
          <DrawerDescription>
            Choose a preset poster design or upload a custom background.
          </DrawerDescription>
        </DrawerHeader>

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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onPick(t.type, "blank");

                    onOpenChange(false);
                  }}
                >
                  + Blank
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => pickWithBackground(t.type, "background")}
                >
                  <Upload className="mr-1.5 h-4 w-4" />
                  With background
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
