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
  festivalId,
  onMediaChanged,
}: {
  editor: PosterEditorState;
  variant?: "docked" | "drawer" | "floating";
  onCollapsePanel?: () => void;
  dbTemplates?: any[];
  onCreateTemplate?: (type: any, options?: any) => void;
  festivalId?: string;
  onMediaChanged?: () => void | Promise<void>;
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
      festivalId={festivalId}
      onMediaChanged={onMediaChanged}
    />
  );
}
