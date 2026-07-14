"use client";

import { Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditorEffectsPopover } from "./EditorEffectsPopover";
import {
  editorBtnIcon,
  editorInputNarrow,
  editorToolbarRow,
} from "./editor-chrome";
import type { PosterEditorState } from "./use-poster-editor-state";

export function EditorContextToolbar({
  editor,
}: {
  editor: PosterEditorState;
}) {
  const { selectedElement, updateElement, undo, redo, canUndo, canRedo } =
    editor;

  const isText = selectedElement?.type === "text";
  const isShape =
    selectedElement &&
    ["rect", "circle", "triangle", "line", "image", "qr"].includes(
      selectedElement.type,
    );

  return (
    <div className={`${editorToolbarRow} min-w-0 flex-1 overflow-x-auto`}>
      <div className="flex shrink-0 items-center gap-0.5 border-r border-border pr-2">
        <Button
          variant="ghost"
          size="icon"
          className={editorBtnIcon}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          onClick={undo}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={editorBtnIcon}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          onClick={redo}
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {selectedElement && isText && (
        <span className="shrink-0 px-1 text-[11px] text-muted-foreground">
          Edit text in the selection panel
        </span>
      )}

      {selectedElement && !isText && (
        <>
          {selectedElement.fill && (
            <Input
              type="color"
              className="h-8 w-10 cursor-pointer p-0.5"
              value={
                selectedElement.fill.startsWith("#")
                  ? selectedElement.fill
                  : "#7c3aed"
              }
              onChange={(e) =>
                updateElement(selectedElement.id, { fill: e.target.value })
              }
            />
          )}
          {isShape && (
            <>
              <Input
                type="color"
                className="h-7 w-9 shrink-0 cursor-pointer p-0.5"
                title="Stroke"
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
              <Input
                type="number"
                className={editorInputNarrow}
                title="Stroke width"
                min={0}
                max={24}
                value={selectedElement.strokeWidth ?? 0}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    strokeWidth: Number(e.target.value),
                  })
                }
              />
            </>
          )}
          <EditorEffectsPopover editor={editor} element={selectedElement} />
        </>
      )}

      {!selectedElement && (
        <span className="shrink-0 px-1 text-[11px] text-muted-foreground">
          Select a layer to edit
        </span>
      )}
    </div>
  );
}
