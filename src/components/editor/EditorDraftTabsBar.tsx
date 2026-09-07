"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";
import { type EditorDraftTab, isTabDirty } from "./editor-draft-tab";

export function EditorDraftTabsBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onNew,
  onRenameTab,
}: {
  tabs: EditorDraftTab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  onRenameTab?: (tabId: string, newLabel: string) => void;
}) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  if (tabs.length === 0) return null;

  const handleStartRename = (tab: EditorDraftTab) => {
    if (!onRenameTab) return;
    setEditingTabId(tab.id);
    setEditValue(tab.label);
  };

  const handleCommitRename = () => {
    if (!editingTabId) return;
    const trimmed = editValue.trim();
    if (trimmed && onRenameTab) {
      onRenameTab(editingTabId, trimmed);
    }
    setEditingTabId(null);
  };

  const handleCancelRename = () => {
    setEditingTabId(null);
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        const dirty = isTabDirty(tab);
        const isEditing = tab.id === editingTabId;

        return (
          <div
            key={tab.id}
            className={cn(
              "group flex h-7 max-w-[10rem] shrink-0 items-center gap-0.5 rounded-md border pr-0.5 text-[11px] font-medium transition-colors xl:max-w-[12rem]",
              active
                ? "border-primary bg-primary/10 text-foreground"
                : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleCommitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCommitRename();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    handleCancelRename();
                  }
                }}
                className="h-5 w-full min-w-0 bg-background px-1.5 text-[11px] font-medium rounded border border-primary outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => onSelect(tab.id)}
                onDoubleClick={() => handleStartRename(tab)}
                title="Double click to rename"
                className="flex min-w-0 flex-1 items-center gap-1 rounded-l-md px-2 py-1 select-none"
              >
                <span className="truncate">{tab.label}</span>
                {dirty && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    title="Unsaved changes"
                  />
                )}
              </button>
            )}
            <button
              type="button"
              className="rounded p-0.5 opacity-60 hover:bg-background/80 hover:opacity-100"
              aria-label={`Close ${tab.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={onNew}
        title="New template tab"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
