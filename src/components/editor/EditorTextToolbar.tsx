"use client";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CaseSensitive,
  Italic,
  Minus,
  Plus,
  Strikethrough,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/core/utils/cn";
import { editorBtnIcon, editorInput, editorInputNarrow } from "./editor-chrome";
import {
  fontLabelForFamily,
  stepFontSize,
  toggleFontStyle,
} from "./editor-text-controls";
import { BUILTIN_FONTS } from "./editor-theme";
import type { PosterEditorState } from "./use-poster-editor-state";

function TextColorControl({
  color,
  onChange,
  className,
}: {
  color: string;
  onChange: (hex: string) => void;
  className?: string;
}) {
  const hex = color.startsWith("#") ? color : "#e2e8f0";
  return (
    <label
      className={cn(
        "relative flex h-7 w-8 shrink-0 cursor-pointer flex-col items-center justify-center rounded-md border border-border bg-background hover:bg-muted/50",
        className,
      )}
      title="Text color"
    >
      <span className="text-[11px] font-bold leading-none text-foreground">
        A
      </span>
      <span
        className="mt-0.5 h-1 w-5 rounded-full"
        style={{ backgroundColor: hex }}
      />
      <input
        type="color"
        className="absolute inset-0 cursor-pointer opacity-0"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function FontSizeStepper({
  size,
  onChange,
}: {
  size: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex h-7 shrink-0 items-stretch overflow-hidden rounded-md border border-border bg-background">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-6 rounded-none"
        title="Decrease size"
        onClick={() => onChange(stepFontSize(size, -1))}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        type="number"
        className="h-7 w-10 shrink-0 rounded-none border-0 border-x border-border px-0 text-center text-[11px] shadow-none focus-visible:ring-0"
        min={8}
        max={200}
        value={size}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-6 rounded-none"
        title="Increase size"
        onClick={() => onChange(stepFontSize(size, 1))}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function EditorTextToolbar({
  editor,
  variant = "full",
}: {
  editor: PosterEditorState;
  variant?: "full" | "compact";
}) {
  const {
    selectedElement,
    updateElement,
    toggleTextDecoration,
    toggleTextCase,
    doc,
  } = editor;

  if (!selectedElement || selectedElement.type !== "text") return null;

  const el = selectedElement;
  const deco = el.textDecoration ?? "";
  const fontSize = el.fontSize ?? 24;
  const fontFamily = el.fontFamily ?? BUILTIN_FONTS[0].value;
  const fill = el.fill?.startsWith("#") ? el.fill : "#e2e8f0";

  const styleButtons = (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        type="button"
        variant={el.fontStyle?.includes("bold") ? "secondary" : "ghost"}
        size="icon"
        className={cn(editorBtnIcon, "font-bold")}
        title="Bold"
        onClick={() =>
          updateElement(el.id, { fontStyle: toggleFontStyle(el, "bold") })
        }
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={el.fontStyle?.includes("italic") ? "secondary" : "ghost"}
        size="icon"
        className={editorBtnIcon}
        title="Italic"
        onClick={() =>
          updateElement(el.id, { fontStyle: toggleFontStyle(el, "italic") })
        }
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={deco.includes("underline") ? "secondary" : "ghost"}
        size="icon"
        className={editorBtnIcon}
        title="Underline"
        onClick={() => toggleTextDecoration("underline")}
      >
        <Underline className="h-4 w-4" />
      </Button>
      {variant === "full" && (
        <>
          <Button
            type="button"
            variant={deco.includes("line-through") ? "secondary" : "ghost"}
            size="icon"
            className={editorBtnIcon}
            title="Strikethrough"
            onClick={() => toggleTextDecoration("line-through")}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={
              el.textCase && el.textCase !== "none" ? "secondary" : "ghost"
            }
            size="icon"
            className={editorBtnIcon}
            title="Toggle case"
            onClick={() => toggleTextCase()}
          >
            <CaseSensitive className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );

  const alignButtons = (
    <div className="flex shrink-0 items-center gap-0.5">
      {(
        [
          ["left", AlignLeft],
          ["center", AlignCenter],
          ["right", AlignRight],
          ...(variant === "full" ? ([["justify", AlignJustify]] as const) : []),
        ] as const
      ).map(([align, Icon]) => (
        <Button
          key={align}
          type="button"
          variant={
            el.align === align || (!el.align && align === "left")
              ? "secondary"
              : "ghost"
          }
          size="icon"
          className={editorBtnIcon}
          title={`Align ${align}`}
          onClick={() => updateElement(el.id, { align })}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-1.5">
      <Select
        value={fontFamily}
        onValueChange={(v) => updateElement(el.id, { fontFamily: v })}
      >
        <SelectTrigger
          className={cn(
            editorInput,
            variant === "full" ? "w-[9rem] max-w-[28vw]" : "w-[6.5rem]",
          )}
          style={{ fontFamily }}
        >
          <SelectValue>{fontLabelForFamily(fontFamily)}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {BUILTIN_FONTS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              <span style={{ fontFamily: f.value }}>{f.label}</span>
            </SelectItem>
          ))}
          {doc?.customFonts.map((f) => (
            <SelectItem key={f.id} value={f.name}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <FontSizeStepper
        size={fontSize}
        onChange={(n) => updateElement(el.id, { fontSize: n })}
      />

      <TextColorControl
        color={fill}
        onChange={(hex) => updateElement(el.id, { fill: hex })}
      />

      <div className="h-5 w-px shrink-0 bg-border" />

      {styleButtons}

      <div className="h-5 w-px shrink-0 bg-border" />

      {alignButtons}

      {variant === "full" && (
        <>
          <div className="h-5 w-px shrink-0 bg-border" />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 px-2 text-[11px]"
              >
                Spacing
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-3" align="start">
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Line height</Label>
                  <Input
                    type="number"
                    className="mt-1 h-7 text-xs"
                    min={0.8}
                    max={3}
                    step={0.05}
                    value={el.lineHeight ?? 1.2}
                    onChange={(e) =>
                      updateElement(el.id, {
                        lineHeight: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Letter spacing (px)</Label>
                  <Input
                    type="number"
                    className="mt-1 h-7 text-xs"
                    min={-2}
                    max={24}
                    step={0.5}
                    value={el.letterSpacing ?? 0}
                    onChange={(e) =>
                      updateElement(el.id, {
                        letterSpacing: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Text box width</Label>
                  <Input
                    type="number"
                    className="mt-1 h-7 text-xs"
                    min={48}
                    value={Math.round(el.width ?? 200)}
                    onChange={(e) =>
                      updateElement(el.id, {
                        width: Math.max(48, Number(e.target.value)),
                      })
                    }
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}
