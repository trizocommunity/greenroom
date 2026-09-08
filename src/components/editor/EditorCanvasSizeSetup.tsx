"use client";

import { Link2, Link2Off, Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type CanvasUnit,
  clampCanvasDimension,
  fromPixels,
  presetsForTemplate,
  toPixels,
} from "./editor-canvas-size";
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
  const [unit, setUnit] = useState<CanvasUnit>("in");
  const [widthInput, setWidthInput] = useState("12.5");
  const [heightInput, setHeightInput] = useState("16.67");
  const [lockAspect, setLockAspect] = useState(true);
  const [aspect, setAspect] = useState(1200 / 1600);

  const formatUnit = (px: number, u: CanvasUnit) => {
    const val = fromPixels(px, u);
    return u === "px"
      ? String(Math.round(val))
      : val.toFixed(2).replace(/\.?0+$/, "");
  };

  useEffect(() => {
    if (!doc) return;
    setWidth(doc.width);
    setHeight(doc.height);
    setWidthInput(formatUnit(doc.width, unit));
    setHeightInput(formatUnit(doc.height, unit));
    setAspect(doc.width / doc.height);
  }, [doc?.width, doc?.height, doc, unit]);

  if (!doc) return null;

  const presets = presetsForTemplate(doc.templateType);

  const applySize = (wPx: number, hPx: number) => {
    const cw = clampCanvasDimension(wPx);
    const ch = clampCanvasDimension(hPx);
    setWidth(cw);
    setHeight(ch);
    setWidthInput(formatUnit(cw, unit));
    setHeightInput(formatUnit(ch, unit));
    setAspect(cw / ch);
    resizeCanvas(cw, ch);
  };

  const onWidthChange = (val: string) => {
    setWidthInput(val);
    const w = parseFloat(val);
    if (!Number.isNaN(w) && w > 0 && lockAspect) {
      setHeightInput(formatUnit(toPixels(w, unit) / aspect, unit));
    }
  };

  const onHeightChange = (val: string) => {
    setHeightInput(val);
    const h = parseFloat(val);
    if (!Number.isNaN(h) && h > 0 && lockAspect) {
      setWidthInput(formatUnit(toPixels(h, unit) * aspect, unit));
    }
  };

  const commitFields = () => {
    const wPx = parseFloat(widthInput)
      ? toPixels(parseFloat(widthInput), unit)
      : width;
    const hPx = parseFloat(heightInput)
      ? toPixels(parseFloat(heightInput), unit)
      : height;
    applySize(wPx, hPx);
  };

  return (
    <div className="space-y-3 border-b border-border pb-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Canvas size
          </p>
        </div>
        <Select value={unit} onValueChange={(v) => setUnit(v as CanvasUnit)}>
          <SelectTrigger className="h-6 w-[70px] text-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="px">px</SelectItem>
            <SelectItem value="in">inch</SelectItem>
            <SelectItem value="cm">cm</SelectItem>
            <SelectItem value="mm">mm</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">
            Width ({unit})
          </Label>
          <Input
            type="number"
            className={editorInput}
            min={0.1}
            step={unit === "px" ? 1 : 0.01}
            value={widthInput}
            onChange={(e) => onWidthChange(e.target.value)}
            onBlur={commitFields}
            onKeyDown={(e) => e.key === "Enter" && commitFields()}
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">
            Height ({unit})
          </Label>
          <Input
            type="number"
            className={editorInput}
            min={0.1}
            step={unit === "px" ? 1 : 0.01}
            value={heightInput}
            onChange={(e) => onHeightChange(e.target.value)}
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
