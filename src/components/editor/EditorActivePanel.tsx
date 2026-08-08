"use client";

import { EditorSidePanel } from "./EditorSidePanel";
import { EditorTemplatesPanel } from "./EditorTemplatesPanel";
import type { PosterEditorState } from "./use-poster-editor-state";

export function EditorActivePanel({
  editor,
  variant = "docked",
  onCollapsePanel,
  dbTemplates,
}: {
  editor: PosterEditorState;
  variant?: "docked" | "drawer" | "floating";
  onCollapsePanel?: () => void;
  dbTemplates?: any[];
}) {
  if (editor.navPanel === "templates") {
    return (
      <EditorTemplatesPanel
        editor={editor}
        variant={variant}
        onCollapsePanel={onCollapsePanel}
        dbTemplates={dbTemplates}
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
