"use client";

import {
  Copy,
  Droplets,
  Magnet,
  Lock,
  Paintbrush,
  Ruler,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  editorBtnIcon,
  editorInputNarrow,
  editorToolbarRow,
} from "./editor-chrome";
import type { PosterEditorState } from "./use-poster-editor-state";

export function EditorToolRail({ editor }: { editor: PosterEditorState }) {
  const {
    selectedElement,
    selectedIds,
    copyFormat,
    formatPainterActive,
    toggleLock,
    duplicateElement,
    removeSelected,
    updateElements,
    showRulers,
    setShowRulers,
    snapGuidesEnabled,
    setSnapGuidesEnabled,
  } = editor;

  const opacity =
    selectedElement?.opacity !== undefined ? selectedElement.opacity : 1;

  return (
    <div className={`${editorToolbarRow} shrink-0 border-l border-border pl-2`}>
      <Button
        variant={showRulers ? "secondary" : "ghost"}
        size="icon"
        className={editorBtnIcon}
        title="Show rulers"
        onClick={() => setShowRulers((v) => !v)}
      >
        <Ruler className="h-4 w-4" />
      </Button>

      <Button
        variant={snapGuidesEnabled ? "secondary" : "ghost"}
        size="icon"
        className={editorBtnIcon}
        title="Smart guides — snap and show distances while aligning"
        onClick={() => setSnapGuidesEnabled((v) => !v)}
      >
        <Magnet className="h-4 w-4" />
      </Button>

      <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">
        <Droplets className="h-3 w-3 text-muted-foreground" />
        <Input
          type="number"
          className={editorInputNarrow}
          min={0}
          max={100}
          value={Math.round(opacity * 100)}
          disabled={selectedIds.length === 0}
          onChange={(e) => {
            const v = Math.min(100, Math.max(0, Number(e.target.value))) / 100;
            updateElements(selectedIds, { opacity: v });
          }}
        />
        <span className="text-[10px] text-muted-foreground">%</span>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 border-l border-border pl-2">
        <Button
          variant="ghost"
          size="icon"
          className={editorBtnIcon}
          title="Lock / unlock"
          disabled={selectedIds.length === 0}
          onClick={toggleLock}
        >
          <Lock className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={editorBtnIcon}
          title="Duplicate"
          disabled={selectedIds.length !== 1}
          onClick={() => selectedIds[0] && duplicateElement(selectedIds[0])}
        >
          <Copy className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={`${editorBtnIcon} text-destructive hover:text-destructive`}
          title="Delete"
          disabled={selectedIds.length === 0}
          onClick={removeSelected}
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <Button
          variant={formatPainterActive ? "secondary" : "ghost"}
          size="icon"
          className={editorBtnIcon}
          title="Format painter"
          disabled={!selectedElement}
          onClick={copyFormat}
        >
          <Paintbrush className="h-4 w-4" />
        </Button>
      </div>

      {selectedIds.length > 1 && (
        <Label className="ml-2 text-xs text-muted-foreground">
          {selectedIds.length} selected
        </Label>
      )}
    </div>
  );
}
