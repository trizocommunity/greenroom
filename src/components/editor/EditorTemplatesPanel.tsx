"use client";

import { FileImage, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SavedPosterTemplate } from "./editor-template-storage";
import { TEMPLATE_TYPES, type PosterTemplateType } from "./poster-editor-config";
import type { PosterEditorState } from "./use-poster-editor-state";
import { editorPanelAside } from "./editor-chrome";
import { EditorPanelHeader } from "./EditorSidePanel";
import { cn } from "@/core/utils/cn";
import { openTemplateBackgroundPicker } from "./template-background-picker";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function TemplateCard({
  item,
  isActive,
  onLoad,
  onDelete,
}: {
  item: SavedPosterTemplate;
  isActive: boolean;
  onLoad: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-background p-3 transition-colors",
        isActive
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-primary/40",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
          {TEMPLATE_TYPES.find((t) => t.type === item.type)?.emoji ?? "📄"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-sm">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            Updated {formatDate(item.updatedAt)}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.document.width}×{item.document.height} px
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1 h-8" onClick={onLoad}>
          Open
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function EditorTemplatesPanel({
  editor,
  variant = "docked",
  onCollapsePanel,
}: {
  editor: PosterEditorState;
  variant?: "docked" | "drawer";
  onCollapsePanel?: () => void;
}) {
  const {
    savedTemplates,
    doc,
    loadSavedTemplate,
    deleteSavedTemplate,
    setSaveModalOpen,
    startTemplate,
  } = editor;

  const defaultTab = doc?.templateType ?? "RESULT";
  const [activeType, setActiveType] = useState<PosterTemplateType>(defaultTab);

  useEffect(() => {
    if (doc?.templateType) setActiveType(doc.templateType);
  }, [doc?.templateType]);

  const grouped = useMemo(() => {
    const map: Record<PosterTemplateType, SavedPosterTemplate[]> = {
      RESULT: [],
      TEAM_POINTS: [],
      CANDIDATE_CARD: [],
    };
    for (const t of savedTemplates) {
      map[t.type].push(t);
    }
    for (const key of Object.keys(map) as PosterTemplateType[]) {
      map[key].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }
    return map;
  }, [savedTemplates]);

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col bg-card",
        variant === "docked" && editorPanelAside,
        variant === "drawer" && "h-full w-full",
      )}
    >
      {variant === "docked" && (
        <EditorPanelHeader title="Templates" onCollapse={onCollapsePanel} />
      )}
      <Tabs
        value={activeType}
        onValueChange={(v) => setActiveType(v as PosterTemplateType)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-2 mt-2 grid h-auto w-auto grid-cols-1 gap-0.5 bg-muted/50 p-1">
          {TEMPLATE_TYPES.map((meta) => (
            <TabsTrigger
              key={meta.type}
              value={meta.type}
              className="h-auto flex-col items-start gap-0.5 px-3 py-2 text-left data-[state=active]:bg-card"
            >
              <span className="text-sm font-medium">
                {meta.emoji} {meta.title}
              </span>
              <span className="text-[10px] font-normal text-muted-foreground">
                {grouped[meta.type].length} saved
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TEMPLATE_TYPES.map((meta) => (
          <TabsContent
            key={meta.type}
            value={meta.type}
            className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden"
          >
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-2 p-2">
                <p className="text-xs text-muted-foreground">{meta.description}</p>
                {meta.type === "TEAM_POINTS" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      toast.message("Use + New for team count setup");
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New {meta.title}
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        startTemplate(meta.type, { withBackground: false })
                      }
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Blank
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        openTemplateBackgroundPicker((url) =>
                          startTemplate(meta.type, {
                            withBackground: true,
                            backgroundImageUrl: url,
                          }),
                        )
                      }
                    >
                      <Upload className="mr-1.5 h-4 w-4" />
                      With background
                    </Button>
                  </div>
                )}

                {grouped[meta.type].length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                    <FileImage className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm font-medium">No saved templates</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Design a poster, then click Save in the toolbar.
                    </p>
                  </div>
                ) : (
                  grouped[meta.type].map((item) => (
                    <TemplateCard
                      key={item.id}
                      item={item}
                      isActive={doc?.savedTemplateId === item.id}
                      onLoad={() => loadSavedTemplate(item.id)}
                      onDelete={() => deleteSavedTemplate(item.id)}
                    />
                  ))
                )}

                {doc?.templateType === meta.type && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setSaveModalOpen(true)}
                  >
                    Save current draft
                  </Button>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </aside>
  );
}
