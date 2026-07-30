"use client";

import { Link2, Link2Off, Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clampCanvasDimension, presetsForTemplate } from "./editor-canvas-size";
import { editorInput } from "./editor-chrome";
import type { PosterEditorState } from "./use-poster-editor-state";

export function EditorCanvasSizeSetup({
  editor,
}: {
  editor: PosterEditorState;
}) {
  const { doc, resizeCanvas } = editor;
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(1600);
  const [lockAspect, setLockAspect] = useState(true);
  const [aspect, setAspect] = useState(1200 / 1600);

  useEffect(() => {
    if (!doc) return;
    setWidth(doc.width);
    setHeight(doc.height);
    setAspect(doc.width / doc.height);
  }, [doc?.width, doc?.height, doc]);

  if (!doc) return null;

  const presets = presetsForTemplate(doc.templateType);

  const applySize = (w: number, h: number) => {
    const cw = clampCanvasDimension(w);
    const ch = clampCanvasDimension(h);
    setWidth(cw);
    setHeight(ch);
    setAspect(cw / ch);
    resizeCanvas(cw, ch);
  };

  const onWidthChange = (raw: number) => {
    const w = clampCanvasDimension(raw);
    const h = lockAspect
      ? clampCanvasDimension(Math.round(w / aspect))
      : height;
    setWidth(w);
    if (lockAspect) setHeight(h);
  };

  const onHeightChange = (raw: number) => {
    const h = clampCanvasDimension(raw);
    const w = lockAspect ? clampCanvasDimension(Math.round(h * aspect)) : width;
    setHeight(h);
    if (lockAspect) setWidth(w);
  };

  const commitFields = () => {
    applySize(width, height);
  };

  return (
    <div className="space-y-3 border-b border-border pb-3">
      <div className="flex items-center gap-2">
        <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Canvas size
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">
            Width (px)
          </Label>
          <Input
            type="number"
            className={editorInput}
            min={320}
            max={5000}
            value={width}
            onChange={(e) => onWidthChange(Number(e.target.value))}
            onBlur={commitFields}
            onKeyDown={(e) => e.key === "Enter" && commitFields()}
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">
            Height (px)
          </Label>
          <Input
            type="number"
            className={editorInput}
            min={320}
            max={5000}
            value={height}
            onChange={(e) => onHeightChange(Number(e.target.value))}
            onBlur={commitFields}
            onKeyDown={(e) => e.key === "Enter" && commitFields()}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 flex-1 text-[11px]"
          onClick={() => setLockAspect((v) => !v)}
        >
          {lockAspect ? (
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Link2Off className="mr-1.5 h-3.5 w-3.5" />
          )}
          {lockAspect ? "Ratio locked" : "Ratio free"}
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 text-[11px]"
          onClick={commitFields}
        >
          Apply
        </Button>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold text-muted-foreground">
          Presets
        </p>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const active =
              doc.width === preset.width && doc.height === preset.height;
            return (
              <Button
                key={preset.id}
                type="button"
                variant={active ? "secondary" : "outline"}
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => applySize(preset.width, preset.height)}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
