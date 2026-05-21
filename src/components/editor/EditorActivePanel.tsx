"use client";

import { EditorSidePanel } from "./EditorSidePanel";
import { EditorTemplatesPanel } from "./EditorTemplatesPanel";
import type { PosterEditorState } from "./use-poster-editor-state";

export function EditorActivePanel({
  editor,
  variant = "docked",
  onCollapsePanel,
}: {
  editor: PosterEditorState;
  variant?: "docked" | "drawer";
  onCollapsePanel?: () => void;
}) {
  if (editor.navPanel === "templates") {
    return (
      <EditorTemplatesPanel
        editor={editor}
        variant={variant}
        onCollapsePanel={onCollapsePanel}
      />
    );
  }
  return (
    <EditorSidePanel
      editor={editor}
      variant={variant}
      onCollapsePanel={onCollapsePanel}
    />
  );
}
