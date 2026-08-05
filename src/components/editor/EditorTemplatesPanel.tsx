"use client";

import { FileImage, Plus, Trash2, Upload } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/core/utils/cn";
import { EditorPanelHeader } from "./EditorSidePanel";
import { editorPanelAside } from "./editor-chrome";
import type { SavedPosterTemplate } from "./editor-template-storage";
import {
  type PosterTemplateType,
  TEMPLATE_TYPES,
} from "./poster-editor-config";
import { openTemplateBackgroundPicker } from "./template-background-picker";
import type { PosterEditorState } from "./use-poster-editor-state";

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

function DbTemplateCard({
  item,
  isActive,
  onLoad,
}: {
  item: any;
  isActive: boolean;
  onLoad: () => void;
}) {
  const isPublished = item.status === "PUBLISHED";
  return (
    <div
      className={cn(
        "rounded-xl border bg-background p-3 transition-colors",
        isActive
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
            {TEMPLATE_TYPES.find((t) => t.type === item.type)?.emoji ?? "📄"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-sm">{item.code}</p>
            <p className="text-xs text-muted-foreground">
              Updated {formatDate(item.updatedAt)}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.width}×{item.height} px
            </p>
          </div>
        </div>
        <div
          className={cn(
            "shrink-0 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm",
            isPublished
              ? "bg-green-500/15 text-green-700 dark:text-green-400"
              : "bg-primary/15 text-primary",
          )}
        >
          {isPublished ? "PUB" : "DRAFT"}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1 h-8" onClick={onLoad}>
          Open
        </Button>
      </div>
    </div>
  );
}

export function EditorTemplatesPanel({
  editor,
  variant = "docked",
  onCollapsePanel,
  dbTemplates,
}: {
  editor: PosterEditorState;
  variant?: "docked" | "drawer" | "floating";
  onCollapsePanel?: () => void;
  dbTemplates?: any[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
      CERTIFICATE: [],
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

  const groupedDb = useMemo(() => {
    const map: Record<PosterTemplateType, any[]> = {
      RESULT: [],
      TEAM_POINTS: [],
      CANDIDATE_CARD: [],
      CERTIFICATE: [],
    };
    if (dbTemplates) {
      for (const t of dbTemplates) {
        const type = t.type as PosterTemplateType;
        if (map[type]) map[type].push(t);
      }
    }
    return map;
  }, [dbTemplates]);

  const displayableTypes = TEMPLATE_TYPES;

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
          {displayableTypes.map((meta) => (
            <TabsTrigger
              key={meta.type}
              value={meta.type}
              className="h-auto flex-col items-start gap-0.5 px-3 py-2 text-left data-[state=active]:bg-card"
            >
              <span className="text-sm font-medium">
                {meta.emoji} {meta.title}
              </span>
              <span className="text-[10px] font-normal text-muted-foreground">
                {groupedDb[meta.type].length} server,{" "}
                {grouped[meta.type].length} local
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {displayableTypes.map((meta) => (
          <TabsContent
            key={meta.type}
            value={meta.type}
            className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden"
          >
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-2 p-2">
                <p className="text-xs text-muted-foreground">
                  {meta.description}
                </p>
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

                {groupedDb[meta.type].map((item) => (
                  <DbTemplateCard
                    key={item.id}
                    item={item}
                    isActive={searchParams.get("code") === item.code}
                    onLoad={() => {
                      const newParams = new URLSearchParams(
                        searchParams.toString(),
                      );
                      newParams.set("code", item.code);
                      router.push(`${pathname}?${newParams.toString()}`);
                      if (window.innerWidth < 1024) {
                        onCollapsePanel?.();
                      }
                    }}
                  />
                ))}

                {grouped[meta.type].map((item) => (
                  <TemplateCard
                    key={item.id}
                    item={item}
                    isActive={doc?.savedTemplateId === item.id}
                    onLoad={() => {
                      loadSavedTemplate(item.id);
                      if (window.innerWidth < 1024) {
                        onCollapsePanel?.();
                      }
                    }}
                    onDelete={() => deleteSavedTemplate(item.id)}
                  />
                ))}

                {groupedDb[meta.type].length === 0 &&
                grouped[meta.type].length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                    <FileImage className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm font-medium">
                      No saved templates
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Design a poster, then click Save in the toolbar.
                    </p>
                  </div>
                ) : null}

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
