"use client";

import { cn } from "@/core/utils/cn";
import { EditorEffectsPopover } from "./EditorEffectsPopover";
import { EditorTextToolbar } from "./EditorTextToolbar";
import {
  editorSelectionDialogBase,
  editorSelectionToolbarDialog,
} from "./editor-chrome";
import type { PosterEditorState } from "./use-poster-editor-state";

/** Absolute rounded dialog — top element toolbar. */
export function EditorSelectionToolbar({
  editor,
}: {
  editor: PosterEditorState;
}) {
  const { selectedId, selectedElement } = editor;

  if (!selectedId) return null;

  const isText = selectedElement?.type === "text";

  return (
    <div
      className={cn(
        editorSelectionToolbarDialog,
        editorSelectionDialogBase,
        !isText && "ring-1 ring-inset ring-primary/30",
      )}
      data-selection-toolbar
      role="toolbar"
      aria-label="Selection tools"
    >
      {isText && (
        <>
          <EditorTextToolbar editor={editor} variant="compact" />
          {selectedElement && (
            <EditorEffectsPopover editor={editor} element={selectedElement} />
          )}
        </>
      )}

      {!isText && selectedElement && (
        <EditorEffectsPopover editor={editor} element={selectedElement} />
      )}
    </div>
  );
}
