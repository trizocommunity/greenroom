"use client";

import type { CSSProperties, ReactNode } from "react";
import { EditorSelectionPanel } from "./EditorSelectionPanel";
import { EditorSelectionToolbar } from "./EditorSelectionToolbar";
import {
  EDITOR_SELECTION_PANEL_WIDTH_PX,
  EDITOR_VERTICAL_RULER_WIDTH,
} from "./editor-chrome";
import type { PosterEditorState } from "./use-poster-editor-state";

const DIALOG_INSET = 12;
const DIALOG_GAP = 8;

/**
 * Canvas stays full-bleed; when a layer is selected, rounded absolute dialogs
 * overlay the wireframe zones (selection ui left, toolbar top-center).
 */
export function EditorSelectionChrome({
  editor,
  children,
}: {
  editor: PosterEditorState;
  children: ReactNode;
}) {
  const { selectedIds, showRulers } = editor;

  const overlayStyle = {
    "--editor-selection-panel-width": `${EDITOR_SELECTION_PANEL_WIDTH_PX}px`,
    "--editor-selection-dialog-inset": `${DIALOG_INSET}px`,
    "--editor-selection-dialog-gap": `${DIALOG_GAP}px`,
    "--editor-selection-ruler-offset": showRulers
      ? `${EDITOR_VERTICAL_RULER_WIDTH}px`
      : "0px",
  } as CSSProperties;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {children}

      {selectedIds.length > 0 && (
        <div
          className="pointer-events-none absolute inset-0 z-30"
          data-selection-chrome
          role="dialog"
          aria-label="Selection editor"
          style={overlayStyle}
        >
          <EditorSelectionPanel editor={editor} />
          <EditorSelectionToolbar editor={editor} />
        </div>
      )}
    </div>
  );
}
