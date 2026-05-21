"use client";

import type Konva from "konva";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { PosterEditorState } from "./use-poster-editor-state";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EditorCanvasRulers } from "./EditorCanvasRulers";
import { EditorContextToolbar } from "./EditorContextToolbar";
import { EditorDraftTabsBar } from "./EditorDraftTabsBar";
import { EditorHeaderActions } from "./EditorHeaderActions";
import { EditorMobileGate } from "./EditorMobileGate";
import { EditorSidebarToggle } from "./EditorSidebarToggle";
import { EditorSidebar } from "./EditorSidebar";
import { EditorPresentButton } from "./EditorPresentButton";
import { EditorPresentOverlay } from "./EditorPresentOverlay";
import { EditorSelectionChrome } from "./EditorSelectionChrome";
import { EditorToolRail } from "./EditorToolRail";
import { NewTemplateModal } from "./NewTemplateModal";
import { PosterEditorCanvas } from "./PosterEditorCanvas";
import type { PosterTemplateType } from "./poster-editor-config";
import { SaveTemplateModal } from "./SaveTemplateModal";
import { TeamCountModal } from "./TeamCountModal";
import {
  EDITOR_VERTICAL_RULER_WIDTH,
  EDITOR_ZOOM_MAX,
  EDITOR_ZOOM_MIN,
  EDITOR_ZOOM_STEP,
  editorToolbarBar,
} from "./editor-chrome";
import { usePosterEditorState } from "./use-poster-editor-state";

export default function PosterEditorPlayground() {
  const editor = usePosterEditorState();
  const stageRef = useRef<Konva.Stage | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [presentOpen, setPresentOpen] = useState(false);

  const {
    doc,
    templateMeta,
    zoom,
    setZoom,
    startTemplate,
    selectedIds,
    tabs,
    activeTabId,
    switchTab,
    closeTab,
    showRulers,
    saveModalOpen,
    setSaveModalOpen,
    saveCurrentTemplate,
    defaultSaveName,
  } = editor;

  const keyboardRef = useRef<{
    doc: PosterEditorState["doc"];
    selectedIds: string[];
    undo: PosterEditorState["undo"];
    redo: PosterEditorState["redo"];
    removeSelected: PosterEditorState["removeSelected"];
    setSaveModalOpen: PosterEditorState["setSaveModalOpen"];
    copySelected: PosterEditorState["copySelected"];
    pasteClipboard: PosterEditorState["pasteClipboard"];
    duplicateSelected: PosterEditorState["duplicateSelected"];
    nudgeSelected: PosterEditorState["nudgeSelected"];
  } | null>(null);

  keyboardRef.current = {
    doc,
    selectedIds,
    undo: editor.undo,
    redo: editor.redo,
    removeSelected: editor.removeSelected,
    setSaveModalOpen,
    copySelected: editor.copySelected,
    pasteClipboard: editor.pasteClipboard,
    duplicateSelected: editor.duplicateSelected,
    nudgeSelected: editor.nudgeSelected,
    setPresentOpen,
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const h = keyboardRef.current;
      if (!h?.doc) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        h.setPresentOpen((open) => !open);
        return;
      }
      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        h.undo();
      }
      if (meta && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        h.redo();
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        h.selectedIds.length > 0
      ) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        h.removeSelected();
      }
      if (meta && e.key === "s") {
        e.preventDefault();
        h.setSaveModalOpen(true);
      }
      if (meta && e.key === "c") {
        e.preventDefault();
        h.copySelected();
      }
      if (meta && e.key === "v") {
        e.preventDefault();
        h.pasteClipboard();
      }
      if (meta && e.key === "d") {
        e.preventDefault();
        h.duplicateSelected();
      }
      const tag = (e.target as HTMLElement).tagName;
      if (
        tag !== "INPUT" &&
        tag !== "TEXTAREA" &&
        tag !== "SELECT" &&
        h.selectedIds.length > 0
      ) {
        const step = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          h.nudgeSelected(-step, 0);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          h.nudgeSelected(step, 0);
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          h.nudgeSelected(0, -step);
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          h.nudgeSelected(0, step);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const exportPng = () => {
    const stage = stageRef.current;
    if (!stage || !doc) return;
    const uri = stage.toDataURL({ pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = uri;
    a.download = `poster-${doc.templateType.toLowerCase()}.png`;
    a.click();
    toast.success("Exported PNG");
  };

  const handleTemplatePick = (
    type: PosterTemplateType,
    mode: "blank" | "background" | "teams",
    backgroundImageUrl?: string,
  ) => {
    if (type === "TEAM_POINTS" && mode === "teams") {
      setTeamModalOpen(true);
      return;
    }
    startTemplate(type, {
      withBackground: mode !== "blank",
      backgroundImageUrl,
    });
  };

  return (
    <>
      <EditorMobileGate />

      <div className="hidden h-dvh overflow-hidden bg-background lg:flex">
        {sidebarOpen && (
          <EditorSidebar
            editor={editor}
            panelOpen={panelOpen}
            onPanelOpenChange={setPanelOpen}
            onHideSidebar={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-card px-2">
            {!sidebarOpen && (
              <EditorSidebarToggle
                onClick={() => {
                  setSidebarOpen(true);
                  setPanelOpen(true);
                }}
              />
            )}
            <EditorDraftTabsBar
              tabs={tabs}
              activeTabId={activeTabId}
              onSelect={switchTab}
              onClose={closeTab}
              onNew={() => setNewModalOpen(true)}
            />
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <EditorHeaderActions editor={editor} onExport={exportPng} />
            </div>
          </header>

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            {doc ? (
              <>
                <div className={editorToolbarBar}>
                  <EditorContextToolbar editor={editor} />
                  <EditorToolRail editor={editor} />
                </div>
                <div
                  ref={canvasViewportRef}
                  className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
                  data-canvas-viewport
                  style={
                    {
                      "--editor-vertical-ruler-width": `${EDITOR_VERTICAL_RULER_WIDTH}px`,
                    } as CSSProperties
                  }
                >
                  <EditorSelectionChrome editor={editor}>
                    <EditorCanvasRulers
                      width={doc.width}
                      height={doc.height}
                      scale={zoom}
                      visible={showRulers}
                      enabled={Boolean(doc)}
                      setZoom={setZoom}
                    >
                      <PosterEditorCanvas
                        editor={editor}
                        stageRef={stageRef}
                        layout="fixed"
                      />
                    </EditorCanvasRulers>
                    <div className="pointer-events-none absolute bottom-4 right-4 z-40">
                      <EditorPresentButton
                        onPresent={() => setPresentOpen(true)}
                        disabled={!doc}
                      />
                    </div>
                    {presentOpen && (
                      <EditorPresentOverlay
                        editor={editor}
                        onClose={() => setPresentOpen(false)}
                      />
                    )}
                    <div className="pointer-events-none absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-border bg-card px-1 py-0.5 text-[11px] text-foreground shadow-md">
                  <button
                    type="button"
                    className="pointer-events-auto rounded px-2 py-1 hover:bg-muted"
                    onClick={() =>
                    setZoom((z) => Math.max(EDITOR_ZOOM_MIN, z - EDITOR_ZOOM_STEP))
                  }
                    aria-label="Zoom out"
                  >
                    −
                  </button>
                  <span className="min-w-[2.5rem] text-center font-medium tabular-nums">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    className="pointer-events-auto rounded px-2 py-1 hover:bg-muted"
                    onClick={() =>
                    setZoom((z) => Math.min(EDITOR_ZOOM_MAX, z + EDITOR_ZOOM_STEP))
                  }
                    aria-label="Zoom in"
                  >
                    +
                  </button>
                {doc && (
                  <span className="hidden border-l border-border pl-2 text-muted-foreground sm:inline">
                    {doc.width}×{doc.height}
                  </span>
                )}
                    </div>
                  </EditorSelectionChrome>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-muted/30 p-4">
                <div className="text-center">
                  <h2 className="text-lg font-bold text-foreground">
                    No template yet
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Create your first poster template
                  </p>
                </div>
                <Button size="sm" onClick={() => setNewModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </Button>
              </div>
            )}
          </div>
        </div>

        <NewTemplateModal
          open={newModalOpen}
          onOpenChange={setNewModalOpen}
          onPick={handleTemplatePick}
        />
        <TeamCountModal
          open={teamModalOpen}
          onOpenChange={setTeamModalOpen}
          onBack={() => {
            setTeamModalOpen(false);
            setNewModalOpen(true);
          }}
          onConfirm={(count) => {
            startTemplate("TEAM_POINTS", {
              teamCount: count,
              withBackground: false,
            });
          }}
        />
        {doc && templateMeta && (
          <SaveTemplateModal
            open={saveModalOpen}
            onOpenChange={setSaveModalOpen}
            defaultName={defaultSaveName}
            templateLabel={templateMeta.title}
            onSave={saveCurrentTemplate}
          />
        )}
      </div>
    </>
  );
}
