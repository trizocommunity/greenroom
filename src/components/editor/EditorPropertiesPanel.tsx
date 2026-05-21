"use client";

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  FlipHorizontal2,
  FlipVertical2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/core/utils/cn";
import { EditorSelectionSection } from "./EditorSelectionSection";
import { finiteNumber, safeRound } from "./editor-utils";
import type { PosterEditorState } from "./use-poster-editor-state";

function SelectionField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const display = safeRound(value, 0);
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <Input
        type="number"
        className="h-7 w-full px-2 text-center text-[11px]"
        value={display}
        min={min}
        max={max}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </label>
  );
}

function numericInputValue(value: number | undefined, fallback = 0): number {
  return safeRound(value, fallback);
}

const pageAlignTools = [
  ["left", AlignStartHorizontal, "Align left"],
  ["center", AlignCenterHorizontal, "Center horizontally"],
  ["right", AlignEndHorizontal, "Align right"],
  ["top", AlignStartVertical, "Align top"],
  ["middle", AlignCenterVertical, "Center vertically"],
  ["bottom", AlignEndVertical, "Align bottom"],
] as const;

const sectionLabel =
  "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

export function EditorPropertiesPanel({
  editor,
  embedded = false,
  compact = false,
  selectionPanel = false,
}: {
  editor: PosterEditorState;
  embedded?: boolean;
  compact?: boolean;
  /** Selection sidebar — hides duplicate arrange controls & uses clearer layout */
  selectionPanel?: boolean;
}) {
  const {
    selectedElement,
    selectedIds,
    updateElement,
    updateElements,
    alignSelected,
    alignSelectedToEachOther,
    flipSelected,
    reorderSelected,
    doc,
  } = editor;

  if (!selectedElement || !doc) return null;

  const posX = finiteNumber(selectedElement.x, 0);
  const posY = finiteNumber(selectedElement.y, 0);
  const rotation = finiteNumber(selectedElement.rotation, 0);
  const opacityPct = safeRound(finiteNumber(selectedElement.opacity, 1) * 100, 100);

  const isText = selectedElement.type === "text";
  const isShape =
    selectedElement.type === "rect" ||
    selectedElement.type === "circle" ||
    selectedElement.type === "triangle" ||
    selectedElement.type === "line";
  const hasFill = Boolean(selectedElement.fill);
  const hasStroke =
    isShape || selectedElement.type === "qr" || selectedElement.type === "image";
  const multi = selectedIds.length > 1;

  if (compact && embedded) {
    const alignGrid = (
      <div className="grid grid-cols-3 gap-1">
        {pageAlignTools.map(([align, Icon, title]) => (
          <Button
            key={align}
            variant="outline"
            size="icon"
            className="h-7 w-full rounded-md"
            title={title}
            aria-label={title}
            onClick={() => alignSelected(align)}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>
    );

    if (selectionPanel) {
      return (
        <div className="space-y-3">
          <EditorSelectionSection title="Position">
            <div className="grid grid-cols-2 gap-1.5">
              <SelectionField
                label="X (px)"
                value={posX}
                onChange={(v) => updateElements(selectedIds, { x: v })}
              />
              <SelectionField
                label="Y (px)"
                value={posY}
                onChange={(v) => updateElements(selectedIds, { y: v })}
              />
              <SelectionField
                label="Rotation (°)"
                value={rotation}
                onChange={(v) => updateElements(selectedIds, { rotation: v })}
              />
              <SelectionField
                label="Opacity (%)"
                value={opacityPct}
                min={0}
                max={100}
                onChange={(v) =>
                  updateElements(selectedIds, {
                    opacity: Math.min(100, Math.max(0, v)) / 100,
                  })
                }
              />
            </div>
          </EditorSelectionSection>

          <EditorSelectionSection title="Align on page">{alignGrid}</EditorSelectionSection>

          {multi && (
            <EditorSelectionSection title="Align selection">
              <div className="grid grid-cols-3 gap-1">
                {pageAlignTools.map(([align, Icon, title]) => (
                  <Button
                    key={`g-${align}`}
                    variant="outline"
                    size="icon"
                    className="h-7 w-full rounded-md"
                    title={`${title} (relative to selection)`}
                    aria-label={`${title} relative to selection`}
                    onClick={() => alignSelectedToEachOther(align)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </EditorSelectionSection>
          )}

          {!multi && hasFill && !isText && (
            <EditorSelectionSection title="Fill color">
              <Input
                type="color"
                className="h-8 w-full cursor-pointer rounded-md p-1"
                aria-label="Fill color"
                value={
                  selectedElement.fill?.startsWith("#")
                    ? selectedElement.fill
                    : "#7c3aed"
                }
                onChange={(e) =>
                  updateElement(selectedElement.id, { fill: e.target.value })
                }
              />
            </EditorSelectionSection>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-1">
          <SelectionField
            label="X"
            value={posX}
            onChange={(v) => updateElements(selectedIds, { x: v })}
          />
          <SelectionField
            label="Y"
            value={posY}
            onChange={(v) => updateElements(selectedIds, { y: v })}
          />
          <SelectionField
            label="Rotation"
            value={rotation}
            onChange={(v) => updateElements(selectedIds, { rotation: v })}
          />
          <SelectionField
            label="Opacity %"
            value={opacityPct}
            min={0}
            max={100}
            onChange={(v) =>
              updateElements(selectedIds, {
                opacity: Math.min(100, Math.max(0, v)) / 100,
              })
            }
          />
        </div>

        <div>
          <p className={cn(sectionLabel, "mb-1")}>Align page</p>
          {alignGrid}
        </div>

        {multi && (
          <div>
            <p className={cn(sectionLabel, "mb-1")}>Align group</p>
            <div className="grid grid-cols-3 gap-1">
              {pageAlignTools.map(([align, Icon, title]) => (
                <Button
                  key={`g-${align}`}
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  title={`${title} to selection`}
                  onClick={() => alignSelectedToEachOther(align)}
                >
                  <Icon className="h-3 w-3" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {!selectionPanel && (
          <div className="flex flex-wrap gap-0.5">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              title="Forward"
              onClick={() => reorderSelected("forward")}
            >
              <span className="text-[9px] font-bold">↑</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              title="Backward"
              onClick={() => reorderSelected("backward")}
            >
              <span className="text-[9px] font-bold">↓</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              title="Flip H"
              onClick={() => flipSelected("horizontal")}
            >
              <FlipHorizontal2 className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              title="Flip V"
              onClick={() => flipSelected("vertical")}
            >
              <FlipVertical2 className="h-3 w-3" />
            </Button>
          </div>
        )}

        {!multi && hasFill && !isText && (
          <div className="flex items-center gap-2">
            <span className={sectionLabel}>Fill</span>
            <Input
              type="color"
              className="h-6 w-10 cursor-pointer p-0"
              value={
                selectedElement.fill?.startsWith("#")
                  ? selectedElement.fill
                  : "#7c3aed"
              }
              onChange={(e) =>
                updateElement(selectedElement.id, { fill: e.target.value })
              }
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={
        embedded ? "space-y-2" : "space-y-3 border-b border-border pb-3"
      }
    >
      {!embedded && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Selection
          </p>
          <p className="mt-0.5 truncate text-sm font-medium">
            {selectedElement.name}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {selectedElement.type}
            {multi ? ` · ${selectedIds.length} selected` : ""}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label className={sectionLabel}>Position</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">X</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              value={numericInputValue(posX)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) updateElements(selectedIds, { x: v });
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Y</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              value={numericInputValue(posY)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) updateElements(selectedIds, { y: v });
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Rotation°</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              value={numericInputValue(rotation)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v))
                  updateElements(selectedIds, { rotation: v });
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Opacity %</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              min={0}
              max={100}
              value={numericInputValue(opacityPct)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v)) return;
                updateElements(selectedIds, {
                  opacity: Math.min(100, Math.max(0, v)) / 100,
                });
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className={sectionLabel}>Align to page</Label>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["left", AlignStartHorizontal],
              ["center", AlignCenterHorizontal],
              ["right", AlignEndHorizontal],
              ["top", AlignStartVertical],
              ["middle", AlignCenterVertical],
              ["bottom", AlignEndVertical],
            ] as const
          ).map(([align, Icon]) => (
            <Button
              key={align}
              variant="outline"
              size="icon"
              className="h-7 w-7"
              title={`Align ${align} to page`}
              onClick={() => alignSelected(align)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>

      {multi && (
        <div className="space-y-2">
          <Label className={sectionLabel}>Align to selection</Label>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["left", AlignStartHorizontal],
                ["center", AlignCenterHorizontal],
                ["right", AlignEndHorizontal],
                ["top", AlignStartVertical],
                ["middle", AlignCenterVertical],
                ["bottom", AlignEndVertical],
              ] as const
            ).map(([align, Icon]) => (
              <Button
                key={`group-${align}`}
                variant="outline"
                size="icon"
                className="h-7 w-7"
                title={`Align ${align} to selection bounds`}
                onClick={() => alignSelectedToEachOther(align)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className={sectionLabel}>Arrange</Label>
        <div className="flex flex-wrap gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => reorderSelected("forward")}
          >
            Forward
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => reorderSelected("backward")}
          >
            Backward
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => reorderSelected("front")}
          >
            To front
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => reorderSelected("back")}
          >
            To back
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            title="Flip horizontal"
            onClick={() => flipSelected("horizontal")}
          >
            <FlipHorizontal2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            title="Flip vertical"
            onClick={() => flipSelected("vertical")}
          >
            <FlipVertical2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isText && selectedIds.length === 1 && (
        <div className="space-y-2">
          <Label className={sectionLabel}>Text box</Label>
          <div>
            <Label className="text-xs">Width (wrap)</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              min={48}
              value={numericInputValue(selectedElement.width, 200)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v))
                  updateElement(selectedElement.id, { width: v });
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Line height</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              min={0.8}
              max={3}
              step={0.05}
              value={finiteNumber(selectedElement.lineHeight, 1.2)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v))
                  updateElement(selectedElement.id, { lineHeight: v });
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Letter spacing (px)</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              min={-2}
              max={24}
              step={0.5}
              value={finiteNumber(selectedElement.letterSpacing, 0)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v))
                  updateElement(selectedElement.id, { letterSpacing: v });
              }}
            />
          </div>
        </div>
      )}

      {selectedElement.type === "rect" && selectedIds.length === 1 && (
        <div className="space-y-2">
          <Label className={sectionLabel}>Rectangle</Label>
          <div>
            <Label className="text-xs">Corner radius</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              min={0}
              max={120}
              value={numericInputValue(selectedElement.cornerRadius, 0)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v))
                  updateElement(selectedElement.id, { cornerRadius: v });
              }}
            />
          </div>
        </div>
      )}

      {(hasFill || hasStroke) && selectedIds.length === 1 && (
        <div className="space-y-2">
          <Label className={sectionLabel}>Fill & stroke</Label>
          {hasFill && (
            <div className="flex items-center gap-2">
              <Label className="text-xs">Fill</Label>
              <Input
                type="color"
                className="h-8 w-12 p-0.5"
                value={
                  selectedElement.fill?.startsWith("#")
                    ? selectedElement.fill
                    : "#7c3aed"
                }
                onChange={(e) =>
                  updateElement(selectedElement.id, { fill: e.target.value })
                }
              />
            </div>
          )}
          {hasStroke && (
            <>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Stroke</Label>
                <Input
                  type="color"
                  className="h-8 w-12 p-0.5"
                  value={
                    selectedElement.stroke?.startsWith("#")
                      ? selectedElement.stroke
                      : "#334155"
                  }
                  onChange={(e) =>
                    updateElement(selectedElement.id, {
                      stroke: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Stroke width</Label>
                <Input
                  type="number"
                  className="h-7 text-xs"
                  min={0}
                  max={24}
                  value={numericInputValue(selectedElement.strokeWidth, 0)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v))
                      updateElement(selectedElement.id, { strokeWidth: v });
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
