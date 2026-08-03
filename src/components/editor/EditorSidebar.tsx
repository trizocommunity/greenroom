"use client";

import { ChevronLeft, ChevronRight, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";
import { EditorActivePanel } from "./EditorActivePanel";
import { EditorNavRail } from "./EditorNavRail";
import { editorBtnIcon } from "./editor-chrome";
import type { PosterEditorState } from "./use-poster-editor-state";

export function EditorSidebar({
  editor,
  panelOpen,
  onPanelOpenChange,
  onHideSidebar,
  brandHref,
  brandLabel,
  dbTemplates,
}: {
  editor: PosterEditorState;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  onHideSidebar: () => void;
  brandHref?: string;
  brandLabel?: string;
  dbTemplates?: any[];
}) {
  const { navPanel, setNavPanel } = editor;

  const handleNavChange = (panel: typeof navPanel) => {
    if (panel === navPanel) {
      onPanelOpenChange(!panelOpen);
      return;
    }
    setNavPanel(panel);
    onPanelOpenChange(true);
  };

  return (
    <aside className="flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <EditorNavRail
          active={navPanel}
          onChange={handleNavChange}
          brandHref={brandHref}
          brandLabel={brandLabel}
          footer={
            <div className="flex w-full flex-col items-center gap-1 border-t border-sidebar-border pt-2">
              <Button
                type="button"
                variant={panelOpen ? "secondary" : "ghost"}
                size="icon"
                className={editorBtnIcon}
                title={panelOpen ? "Collapse panel" : "Expand panel"}
                onClick={() => onPanelOpenChange(!panelOpen)}
              >
                {panelOpen ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={editorBtnIcon}
                title="Hide sidebar"
                onClick={onHideSidebar}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
          }
        />

        <div
          className={cn(
            "flex min-h-0 flex-col overflow-hidden border-l border-sidebar-border/80 transition-[width] duration-200 ease-out",
            panelOpen ? "w-64 lg:w-72 xl:w-80" : "w-0 border-l-0",
          )}
        >
          {panelOpen && (
            <EditorActivePanel
              editor={editor}
              variant="docked"
              onCollapsePanel={() => onPanelOpenChange(false)}
              dbTemplates={dbTemplates}
            />
          )}
        </div>
      </div>
    </aside>
  );
}
