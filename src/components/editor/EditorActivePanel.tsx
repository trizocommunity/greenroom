"use client";

import { EditorSidePanel } from "./EditorSidePanel";
import { EditorTemplatesPanel } from "./EditorTemplatesPanel";
import type { PosterEditorState } from "./use-poster-editor-state";

export function EditorActivePanel({
  editor,
  variant = "docked",
  onCollapsePanel,
  dbTemplates,
  onCreateTemplate,
}: {
  editor: PosterEditorState;
  variant?: "docked" | "drawer" | "floating";
  onCollapsePanel?: () => void;
  dbTemplates?: any[];
  onCreateTemplate?: (type: any, options?: any) => void;
}) {
  if (editor.navPanel === "templates") {
    return (
      <EditorTemplatesPanel
        editor={editor}
        variant={variant}
        onCollapsePanel={onCollapsePanel}
        dbTemplates={dbTemplates}
        onCreateTemplate={onCreateTemplate}
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
