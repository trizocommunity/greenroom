"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";
import { EditorPropertiesPanel } from "./EditorPropertiesPanel";
import { EditorSelectedElementsPanel } from "./EditorSelectedElementsPanel";
import { EditorSelectionQuickActions } from "./EditorSelectionQuickActions";
import { EditorSelectionTextSection } from "./EditorSelectionTextSection";
import {
  editorSelectionDialogBase,
  editorSelectionPanelDialog,
  editorSelectionScroll,
  selectionPanelDialogStyle,
} from "./editor-chrome";
import type { PosterEditorState } from "./use-poster-editor-state";

function layerTypeLabel(type: string) {
  return type.replace(/_/g, " ");
}

/** Absolute rounded dialog — selection inspector. */
export function EditorSelectionPanel({
  editor,
}: {
  editor: PosterEditorState;
}) {
  const { selectedElement, setSelectedId, selectedIds } = editor;

  const multi = selectedIds.length > 1;
  const isText = !multi && selectedElement?.type === "text";
  const title =
    selectedIds.length === 1 && selectedElement
      ? selectedElement.name
      : `${selectedIds.length} layers selected`;

  return (
    <aside
      className={cn(editorSelectionPanelDialog, editorSelectionDialogBase)}
      style={selectionPanelDialogStyle()}
      data-selection-panel
      role="dialog"
      aria-label="Selection properties"
    >
      <div className="flex shrink-0 items-start gap-2 border-b border-border px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            {title}
          </p>
          {selectedElement && !multi && (
            <p className="mt-0.5 text-[10px] capitalize text-muted-foreground">
              {layerTypeLabel(selectedElement.type)}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          title="Deselect (Esc)"
          aria-label="Deselect"
          onClick={() => setSelectedId(null)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div
        className={cn(
          "min-h-0 overflow-y-auto overscroll-contain px-3 py-2.5",
          editorSelectionScroll,
        )}
      >
        {multi && (
          <div className="mb-3">
            <EditorSelectedElementsPanel editor={editor} layout="compact" />
          </div>
        )}

        {isText && <EditorSelectionTextSection editor={editor} />}

        <EditorPropertiesPanel
          editor={editor}
          embedded
          compact
          selectionPanel
        />

        <EditorSelectionQuickActions editor={editor} />
      </div>
    </aside>
  );
}
