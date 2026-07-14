"use client";

import {
  ChevronDown,
  ChevronUp,
  Circle,
  ImageIcon,
  Minus,
  QrCode,
  Square,
  Triangle,
  Type,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";
import {
  editorSelectionScroll,
  editorSelectionSectionLabel,
} from "./editor-chrome";
import { getUnionBounds } from "./editor-element-actions";
import type { EditorElement } from "./poster-editor-types";
import type { PosterEditorState } from "./use-poster-editor-state";

function ElementTypeIcon({ el }: { el: EditorElement }) {
  const className = "h-4 w-4 shrink-0 text-muted-foreground";
  switch (el.type) {
    case "text":
      return <Type className={className} />;
    case "image":
      return <ImageIcon className={className} />;
    case "rect":
      return <Square className={className} />;
    case "circle":
      return <Circle className={className} />;
    case "triangle":
      return <Triangle className={className} />;
    case "line":
      return <Minus className={className} />;
    case "qr":
      return <QrCode className={className} />;
    default:
      return <Square className={className} />;
  }
}

function ElementThumb({
  el,
  size = "md",
}: {
  el: EditorElement;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "h-10 w-10" : "h-8 w-8";
  if (el.type === "image" && el.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={el.imageUrl}
        alt=""
        className={cn(
          "shrink-0 rounded border border-border object-cover bg-muted",
          dim,
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded border border-border bg-muted/60",
        dim,
      )}
    >
      <ElementTypeIcon el={el} />
    </div>
  );
}

export function EditorSelectedElementsPanel({
  editor,
  layout = "list",
}: {
  editor: PosterEditorState;
  layout?: "list" | "chips" | "compact" | "spacious";
}) {
  const {
    selectedIds,
    selectedId,
    selectedElements,
    selectElement,
    setSelectedId,
  } = editor;

  const [collapsed, setCollapsed] = useState(layout === "list");

  const orderedSelection = useMemo(() => {
    const byId = new Map(selectedElements.map((el) => [el.id, el]));
    return selectedIds
      .map((id) => byId.get(id))
      .filter((el): el is EditorElement => el != null);
  }, [selectedElements, selectedIds]);

  const unionBounds = useMemo(
    () => getUnionBounds(selectedElements),
    [selectedElements],
  );

  if (selectedIds.length === 0) return null;

  const chipRow = (
    <div
      className={cn(
        "flex gap-1.5 overflow-x-auto pb-0.5",
        editorSelectionScroll,
        layout === "chips" && "max-h-[120px] min-h-0 flex-wrap",
        layout === "list" && "max-h-36 flex-col space-y-1 overflow-y-auto",
      )}
    >
      {orderedSelection.map((el) => {
        const isPrimary = el.id === selectedId;
        const chipButton = (
          <button
            type="button"
            className={cn(
              "flex shrink-0 items-center gap-1.5 text-left text-xs transition-colors",
              layout === "chips"
                ? "max-w-[9rem] rounded-full border px-2 py-1"
                : "min-w-0 flex-1 gap-2 rounded-lg border px-1.5 py-1",
              isPrimary
                ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                : layout === "chips"
                  ? "border-border bg-background hover:bg-muted/50"
                  : "border-transparent bg-background hover:border-border hover:bg-muted/40",
            )}
            onClick={(e) => {
              if (e.shiftKey) {
                selectElement(el.id, true);
              } else {
                selectElement(el.id);
              }
            }}
          >
            {layout === "chips" ? (
              <ElementTypeIcon el={el} />
            ) : (
              <ElementThumb el={el} />
            )}
            <span className="min-w-0 truncate font-medium leading-tight">
              {el.name}
            </span>
          </button>
        );

        if (layout === "chips") {
          return (
            <div key={el.id} className="flex shrink-0 items-center gap-0.5">
              {chipButton}
              {selectedIds.length > 1 && (
                <button
                  type="button"
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Remove from selection"
                  onClick={() => selectElement(el.id, true)}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        }

        return (
          <div
            key={el.id}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border px-1.5 py-1",
              isPrimary
                ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                : "border-transparent bg-background",
            )}
          >
            {chipButton}
            {selectedIds.length > 1 && (
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Remove from selection (Shift+click row to toggle)"
                onClick={() => selectElement(el.id, true)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  if (layout === "spacious") {
    return (
      <div className="space-y-2">
        <p className={editorSelectionSectionLabel}>Selected layers</p>
        <div
          className={cn(
            "max-h-48 space-y-1.5 overflow-y-auto",
            editorSelectionScroll,
          )}
        >
          {orderedSelection.map((el) => {
            const isPrimary = el.id === selectedId;
            return (
              <button
                key={el.id}
                type="button"
                className={cn(
                  "flex w-full min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  isPrimary
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border bg-muted/30 hover:bg-muted/50",
                )}
                onClick={(e) => {
                  if (e.shiftKey) selectElement(el.id, true);
                  else selectElement(el.id);
                }}
              >
                <ElementThumb el={el} size="lg" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {el.name}
                </span>
              </button>
            );
          })}
        </div>
        {unionBounds && selectedIds.length >= 2 && (
          <p className="text-xs text-muted-foreground">
            Group size {Math.round(unionBounds.width)}×
            {Math.round(unionBounds.height)} px
          </p>
        )}
      </div>
    );
  }

  if (layout === "compact") {
    return (
      <div
        className={cn(
          "mb-2 max-h-24 space-y-0.5 overflow-y-auto",
          editorSelectionScroll,
        )}
      >
        {orderedSelection.map((el) => {
          const isPrimary = el.id === selectedId;
          return (
            <button
              key={el.id}
              type="button"
              className={cn(
                "flex w-full min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-left text-[11px]",
                isPrimary
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
              onClick={(e) => {
                if (e.shiftKey) selectElement(el.id, true);
                else selectElement(el.id);
              }}
            >
              <ElementTypeIcon el={el} />
              <span className="min-w-0 flex-1 truncate">{el.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (layout === "chips") {
    return (
      <div className="space-y-1">
        {unionBounds && selectedIds.length >= 2 && (
          <p className="text-[10px] text-muted-foreground">
            {selectedIds.length} layers · {Math.round(unionBounds.width)}×
            {Math.round(unionBounds.height)} px
          </p>
        )}
        {chipRow}
      </div>
    );
  }

  return (
    <div className="space-y-2 border-b border-border pb-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1 text-left"
          onClick={() => setCollapsed((c) => !c)}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Selected elements
          </p>
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {selectedIds.length}
          </span>
          {collapsed ? (
            <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        {selectedIds.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 px-1.5 text-[10px] text-muted-foreground"
            onClick={() => setSelectedId(null)}
          >
            Clear
          </Button>
        )}
      </div>

      {!collapsed && (
        <>
          {unionBounds && selectedIds.length >= 2 && (
            <p className="text-[11px] text-muted-foreground">
              {selectedIds.length} layers · {Math.round(unionBounds.width)}×
              {Math.round(unionBounds.height)} px
            </p>
          )}
          {chipRow}
          <p className="text-[10px] text-muted-foreground">
            Click to focus · Shift+click to toggle
          </p>
        </>
      )}
    </div>
  );
}
