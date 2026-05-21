"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { EditorElement } from "./poster-editor-types";
import type { PosterEditorState } from "./use-poster-editor-state";

export function EditorEffectsPopover({
  editor,
  element,
}: {
  editor: PosterEditorState;
  element: EditorElement;
}) {
  const { updateElement } = editor;
  const hasShadow = Boolean(element.shadowColor && element.shadowBlur);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasShadow ? "secondary" : "outline"}
          size="sm"
          className="h-8 gap-1 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Effects
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Shadow
        </p>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="shadow-on" className="text-xs">
            Enable shadow
          </Label>
          <Switch
            id="shadow-on"
            checked={hasShadow}
            onCheckedChange={(on) => {
              if (on) {
                updateElement(element.id, {
                  shadowColor: "#000000",
                  shadowBlur: 8,
                  shadowOffsetX: 2,
                  shadowOffsetY: 2,
                  shadowOpacity: 0.35,
                });
              } else {
                updateElement(element.id, {
                  shadowColor: undefined,
                  shadowBlur: undefined,
                  shadowOffsetX: undefined,
                  shadowOffsetY: undefined,
                  shadowOpacity: undefined,
                });
              }
            }}
          />
        </div>
        {hasShadow && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Color</Label>
              <Input
                type="color"
                className="h-8 w-12 p-0.5"
                value={element.shadowColor ?? "#000000"}
                onChange={(e) =>
                  updateElement(element.id, { shadowColor: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Blur</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  min={0}
                  max={40}
                  value={element.shadowBlur ?? 8}
                  onChange={(e) =>
                    updateElement(element.id, {
                      shadowBlur: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Opacity</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  min={0}
                  max={1}
                  step={0.05}
                  value={element.shadowOpacity ?? 0.35}
                  onChange={(e) =>
                    updateElement(element.id, {
                      shadowOpacity: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Offset X</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={element.shadowOffsetX ?? 0}
                  onChange={(e) =>
                    updateElement(element.id, {
                      shadowOffsetX: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Offset Y</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={element.shadowOffsetY ?? 0}
                  onChange={(e) =>
                    updateElement(element.id, {
                      shadowOffsetY: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
