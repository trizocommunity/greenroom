"use client";

import {
  ChevronLeft,
  Circle,
  ImageIcon,
  Minus,
  Square,
  Trash2,
  Triangle,
  Upload,
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditorCanvasSizeSetup } from "./EditorCanvasSizeSetup";
import { EditorFontsPanel } from "./EditorFontsPanel";
import { BACKGROUND_SWATCHES } from "./poster-editor-config";
import { editorPanelAside } from "./editor-chrome";
import type { PosterEditorState } from "./use-poster-editor-state";
import type { EditorNavPanel } from "./poster-editor-config";
import { cn } from "@/core/utils/cn";

export function EditorPanelHeader({
  title,
  onCollapse,
}: {
  title: string;
  onCollapse?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b px-3 py-2">
      <h2 className="min-w-0 flex-1 text-[11px] font-bold uppercase tracking-wide text-foreground">
        {title}
      </h2>
      {onCollapse && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground"
          title="Collapse panel"
          onClick={onCollapse}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function PanelTitle({
  panel,
  onCollapse,
}: {
  panel: EditorNavPanel;
  onCollapse?: () => void;
}) {
  const labels: Record<EditorNavPanel, string> = {
    templates: "Templates",
    elements: "Elements",
    bg: "Background",
    layers: "Canvas layers",
    fonts: "Fonts",
  };
  return <EditorPanelHeader title={labels[panel]} onCollapse={onCollapse} />;
}

function FieldTile({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-center text-xs font-medium shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/10"
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="leading-tight">{label}</span>
    </button>
  );
}

function ShapeTile({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-xs font-medium shadow-sm hover:bg-muted/60"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

export function EditorSidePanel({
  editor,
  variant = "docked",
  onCollapsePanel,
}: {
  editor: PosterEditorState;
  variant?: "docked" | "drawer";
  onCollapsePanel?: () => void;
}) {
  const bgInputRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);

  const {
    navPanel,
    doc,
    fieldsForTemplate,
    fieldsSectionTitle,
    fieldsSectionHint,
    addFestField,
    addTextBlock,
    addShape,
    addImageFromFile,
    updateBackground,
    sortedElements,
    selectedId,
    setSelectedId,
    moveLayer,
    removeElement,
  } = editor;

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col bg-card",
        variant === "docked" && editorPanelAside,
        variant === "drawer" && "h-full w-full",
      )}
    >
      {variant === "docked" && (
        <PanelTitle panel={navPanel} onCollapse={onCollapsePanel} />
      )}
      {navPanel === "fonts" ? (
        <div className="flex min-h-0 flex-1 flex-col p-3">
          <EditorFontsPanel editor={editor} />
        </div>
      ) : (
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-3">
          {navPanel === "elements" && (
            <>
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {fieldsSectionTitle}
                </p>
                {fieldsSectionHint && (
                  <p className="mb-3 text-xs text-muted-foreground">
                    {fieldsSectionHint}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {fieldsForTemplate.map((f) => (
                    <FieldTile
                      key={f.key}
                      icon={f.icon}
                      label={f.label}
                      onClick={() => {
                        if (!doc) {
                          toast.message("Create a template first");
                          return;
                        }
                        addFestField(f.key);
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Text
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ShapeTile
                    label="Heading"
                    onClick={() => doc && addTextBlock("heading")}
                  >
                    <span className="text-lg font-bold">H</span>
                  </ShapeTile>
                  <ShapeTile
                    label="Body"
                    onClick={() => doc && addTextBlock("body")}
                  >
                    <span className="text-base">T</span>
                  </ShapeTile>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Images & shapes
                </p>
                <input
                  ref={assetInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && doc) addImageFromFile(f);
                    e.target.value = "";
                  }}
                />
                <div className="grid grid-cols-3 gap-2">
                  <ShapeTile
                    label="Upload"
                    onClick={() => {
                      if (!doc) return toast.message("Create a template first");
                      assetInputRef.current?.click();
                    }}
                  >
                    <Upload className="h-5 w-5" />
                  </ShapeTile>
                  <ShapeTile
                    label="Rectangle"
                    onClick={() => doc && addShape("rect")}
                  >
                    <Square className="h-5 w-5" />
                  </ShapeTile>
                  <ShapeTile
                    label="Circle"
                    onClick={() => doc && addShape("circle")}
                  >
                    <Circle className="h-5 w-5" />
                  </ShapeTile>
                  <ShapeTile
                    label="Triangle"
                    onClick={() => doc && addShape("triangle")}
                  >
                    <Triangle className="h-5 w-5" />
                  </ShapeTile>
                  <ShapeTile
                    label="Line"
                    onClick={() => doc && addShape("line")}
                  >
                    <Minus className="h-5 w-5" />
                  </ShapeTile>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  PNG, JPG, WebP, or SVG. Uploaded to cloud automatically.
                </p>
              </div>
            </>
          )}

          {navPanel === "bg" && doc && (
            <>
              <EditorCanvasSizeSetup editor={editor} />
              <input
                ref={bgInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = URL.createObjectURL(f);
                    updateBackground({
                      type: "image",
                      color: doc.background.color,
                      imageUrl: url,
                    });
                  }
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => bgInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-4 py-8 text-sm text-muted-foreground hover:border-primary/40"
              >
                <ImageIcon className="h-8 w-8 opacity-50" />
                Add background
                <span className="text-xs">PNG, JPG, WebP, SVG</span>
              </button>
              <div>
                <p className="mb-2 text-xs font-semibold">Solid color</p>
                <div className="grid grid-cols-5 gap-2">
                  {BACKGROUND_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      className="aspect-square w-full rounded-full border-2 border-white shadow ring-1 ring-border transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        updateBackground({
                          type: "solid",
                          color,
                          imageUrl: undefined,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {navPanel === "layers" && doc && (
            <div className="space-y-1">
              {[...sortedElements].reverse().map((el) => (
                <div
                  key={el.id}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-2 text-xs ${
                    selectedId === el.id
                      ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                      : "border-transparent bg-background"
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left font-medium"
                    onClick={() => setSelectedId(el.id)}
                  >
                    {el.name}
                  </button>
                  <button
                    type="button"
                    className="px-1 text-muted-foreground hover:text-foreground"
                    onClick={() => moveLayer(el.id, "up")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="px-1 text-muted-foreground hover:text-foreground"
                    onClick={() => moveLayer(el.id, "down")}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-destructive"
                    onClick={() => removeElement(el.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </ScrollArea>
      )}
    </aside>
  );
}
