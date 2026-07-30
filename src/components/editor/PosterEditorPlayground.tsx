"use client";

import type Konva from "konva";
import { Plus } from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { EditorAutosaveIndicator } from "@/components/festival/posters/EditorAutosaveIndicator";
import { PublishPosterTemplateDialog } from "@/components/festival/posters/PublishPosterTemplateDialog";
import { usePosterEditorAutosave } from "@/components/festival/posters/use-poster-editor-autosave";
import { Button } from "@/components/ui/button";
import type { PosterBindings } from "@/features/posters/services/poster-bindings.service";
import { EditorCanvasRulers } from "./EditorCanvasRulers";
import { EditorContextToolbar } from "./EditorContextToolbar";
import { EditorDraftTabsBar } from "./EditorDraftTabsBar";
import { EditorHeaderActions } from "./EditorHeaderActions";
import { EditorMobileGate } from "./EditorMobileGate";
import { EditorPresentButton } from "./EditorPresentButton";
import { EditorPresentOverlay } from "./EditorPresentOverlay";
import { EditorSelectionChrome } from "./EditorSelectionChrome";
import { EditorSidebar } from "./EditorSidebar";
import { EditorSidebarToggle } from "./EditorSidebarToggle";
import { EditorToolRail } from "./EditorToolRail";
import {
  EDITOR_VERTICAL_RULER_WIDTH,
  EDITOR_ZOOM_MAX,
  EDITOR_ZOOM_MIN,
  EDITOR_ZOOM_STEP,
  editorToolbarBar,
} from "./editor-chrome";
import { NewTemplateModal } from "./NewTemplateModal";
import { PosterEditorCanvas } from "./PosterEditorCanvas";
import type { PosterTemplateType } from "./poster-editor-config";
import type { PosterEditorDocument } from "./poster-editor-types";
import { SaveTemplateModal } from "./SaveTemplateModal";
import { TeamCountModal } from "./TeamCountModal";
import type { PosterEditorState } from "./use-poster-editor-state";
import { usePosterEditorState } from "./use-poster-editor-state";

export type PosterEditorAutosaveConfig = {
  festivalId: string;
  templateCode: string;
  saveDraft: (doc: PosterEditorDocument) => Promise<boolean>;
  onSaved?: () => void;
  debounceMs?: number;
};

export type PublishTemplateConfig = {
  templateCode: string;
  onConfirmPublish: (doc: PosterEditorDocument) => Promise<boolean>;
  pending?: boolean;
};

export type ResetTemplateConfig = {
  templateCode: string;
  /** e.g. clear local autosave backup, refresh preview bindings */
  onAfterReset?: () => void | Promise<void>;
};

export default function PosterEditorPlayground({
  initialDocument,
  templateCode,
  onSaveDraft,
  autosave,
  headerEnd,
  sidebarBrandHref,
  sidebarBrandLabel,
  publishTemplate,
  previewBindings,
  previewDataHint,
  resetTemplate,
  saveNowLabel,
}: {
  initialDocument?: PosterEditorDocument | null;
  templateCode?: string;
  onSaveDraft?: (doc: PosterEditorDocument) => void;
  autosave?: PosterEditorAutosaveConfig;
  headerEnd?: ReactNode;
  sidebarBrandHref?: string;
  sidebarBrandLabel?: string;
  publishTemplate?: PublishTemplateConfig;
  previewBindings?: PosterBindings | null;
  previewDataHint?: string | null;
  resetTemplate?: ResetTemplateConfig;
  /** Custom label for the Save / Save now button */
  saveNowLabel?: string;
} = {}) {
  const editor = usePosterEditorState({ previewBindings });
  const stageRef = useRef<Konva.Stage | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [presentOpen, setPresentOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

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
    loadDocument,
    isDirty,
    markDocumentSaved,
  } = editor;

  const autosaveState = usePosterEditorAutosave({
    enabled: Boolean(autosave),
    festivalId: autosave?.festivalId ?? "",
    templateCode: autosave?.templateCode ?? templateCode ?? "",
    getDocument: () => editor.doc,
    isDirty: Boolean(autosave && isDirty),
    saveDraft: autosave?.saveDraft ?? (async () => false),
    onSaved: () => {
      markDocumentSaved();
      autosave?.onSaved?.();
    },
    debounceMs: autosave?.debounceMs,
  });

  /** Avoid re-opening initial doc when user closes the last tab (tabs.length → 0). */
  const initialLoadKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!initialDocument) return;
    const loadKey = `${templateCode ?? ""}::${initialDocument.updatedAt}`;
    if (initialLoadKeyRef.current === loadKey) return;
    initialLoadKeyRef.current = loadKey;
    loadDocument(initialDocument, templateCode);
  }, [initialDocument, templateCode, loadDocument]);

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
    setPresentOpen: React.Dispatch<React.SetStateAction<boolean>>;
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
            brandHref={sidebarBrandHref}
            brandLabel={sidebarBrandLabel}
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
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {autosave && (
                <EditorAutosaveIndicator
                  status={autosaveState.status}
                  lastSavedAt={autosaveState.lastSavedAt}
                  errorMessage={autosaveState.errorMessage}
                />
              )}
              {(onSaveDraft || autosave) && doc && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7"
                  onClick={() => {
                    if (autosave) void autosaveState.saveNow();
                    else onSaveDraft?.(doc);
                  }}
                >
                  {saveNowLabel ?? (autosave ? "Save now" : "Save to festival")}
                </Button>
              )}
              <EditorHeaderActions
                editor={editor}
                previewDataHint={previewDataHint}
                resetTemplate={resetTemplate}
              />
              {publishTemplate && doc && (
                <Button
                  type="button"
                  size="sm"
                  className="h-7"
                  disabled={publishTemplate.pending}
                  onClick={() => setPublishOpen(true)}
                >
                  Publish template
                </Button>
              )}
              {headerEnd}
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
                          setZoom((z) =>
                            Math.max(EDITOR_ZOOM_MIN, z - EDITOR_ZOOM_STEP),
                          )
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
                          setZoom((z) =>
                            Math.min(EDITOR_ZOOM_MAX, z + EDITOR_ZOOM_STEP),
                          )
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
        {publishTemplate && doc && (
          <PublishPosterTemplateDialog
            open={publishOpen}
            onOpenChange={setPublishOpen}
            document={doc}
            templateCode={publishTemplate.templateCode}
            loading={publishTemplate.pending}
            previewBindings={previewBindings ?? undefined}
            previewPlaceholderHint={previewDataHint ?? undefined}
            onConfirm={async () => {
              const ok = await publishTemplate.onConfirmPublish(doc);
              if (ok) setPublishOpen(false);
            }}
          />
        )}
      </div>
    </>
  );
}
