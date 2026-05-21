"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";
import { isTabDirty, type EditorDraftTab } from "./editor-draft-tab";

export function EditorDraftTabsBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onNew,
}: {
  tabs: EditorDraftTab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        const dirty = isTabDirty(tab);
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={cn(
              "group flex h-7 max-w-[9rem] shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors xl:max-w-[11rem]",
              active
                ? "border-primary bg-primary/10 text-foreground"
                : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            <span className="truncate">{tab.label}</span>
            {dirty && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                title="Unsaved changes"
              />
            )}
            <span
              role="button"
              tabIndex={0}
              className="rounded p-0.5 opacity-60 hover:bg-background/80 hover:opacity-100"
              aria-label={`Close ${tab.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  e.preventDefault();
                  onClose(tab.id);
                }
              }}
            >
              <X className="h-3 w-3" />
            </span>
          </button>
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
