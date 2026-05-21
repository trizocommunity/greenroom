"use client";

import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";
import { editorBtnIcon } from "./editor-chrome";
import { EditorSelectionSection } from "./EditorSelectionSection";
import type { PosterEditorState } from "./use-poster-editor-state";

function ToolButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(editorBtnIcon, "rounded-md", className)}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function EditorSelectionQuickActions({
  editor,
}: {
  editor: PosterEditorState;
}) {
  const {
    selectedId,
    duplicateElement,
    removeSelected,
    reorderSelected,
    flipSelected,
  } = editor;

  if (!selectedId) return null;

  return (
    <div className="space-y-3 border-t border-border pt-2.5">
      <EditorSelectionSection title="Layer order">
        <div className="grid grid-cols-4 gap-1">
          <ToolButton
            label="Bring to front"
            onClick={() => reorderSelected("front")}
          >
            <ArrowUpToLine className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton
            label="Bring forward"
            onClick={() => reorderSelected("forward")}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton
            label="Send backward"
            onClick={() => reorderSelected("backward")}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton
            label="Send to back"
            onClick={() => reorderSelected("back")}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </ToolButton>
        </div>
      </EditorSelectionSection>

      <EditorSelectionSection title="Flip">
        <div className="flex gap-1">
          <ToolButton
            label="Flip horizontal"
            onClick={() => flipSelected("horizontal")}
          >
            <FlipHorizontal2 className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton
            label="Flip vertical"
            onClick={() => flipSelected("vertical")}
          >
            <FlipVertical2 className="h-3.5 w-3.5" />
          </ToolButton>
        </div>
      </EditorSelectionSection>

      <EditorSelectionSection title="Element">
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 gap-1.5 text-[11px]"
            onClick={() => duplicateElement(selectedId)}
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={removeSelected}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </EditorSelectionSection>
    </div>
  );
}
