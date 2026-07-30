"use client";

import { Lock } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/core/utils/cn";
import { EditorSelectionSection } from "./EditorSelectionSection";
import {
  applyTextCase,
  estimateTextWidth,
  getEditableText,
} from "./editor-utils";
import { FEST_ADMIN_FIELDS } from "./poster-editor-config";
import type { PosterEditorState } from "./use-poster-editor-state";

function festFieldLabel(bindingKey: string) {
  return (
    FEST_ADMIN_FIELDS.find((f) => f.key === bindingKey)?.label ?? bindingKey
  );
}

export function EditorSelectionTextSection({
  editor,
}: {
  editor: PosterEditorState;
}) {
  const { selectedElement, updateElement, previewMode, displayText } = editor;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textId = selectedElement?.type === "text" ? selectedElement.id : null;

  useEffect(() => {
    if (!textId) return;
    const el = selectedElement;
    if (el?.type !== "text" || el.bindingKey) return;
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, [textId, selectedElement]);

  if (!selectedElement || selectedElement.type !== "text") return null;

  const el = selectedElement;
  const isBoundField = Boolean(el.bindingKey);
  const raw = getEditableText(el);
  const bindingLabel = el.bindingKey ? festFieldLabel(el.bindingKey) : null;
  const fontSize = el.fontSize ?? 24;
  const previewSize = Math.min(16, fontSize * 0.5);
  const canvasPreview = displayText(el);

  const handleChange = (value: string) => {
    updateElement(el.id, {
      text: value,
      width: estimateTextWidth(value, fontSize),
    });
  };

  return (
    <EditorSelectionSection
      title="Text content"
      className="border-b border-border pb-2.5"
    >
      {bindingLabel && (
        <div className="space-y-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-2">
          <p className="flex items-center gap-1 text-[10px] font-semibold text-primary">
            <Lock className="h-3 w-3 shrink-0" />
            FestAdmin field: {bindingLabel}
          </p>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Name and value come from live festival data at export time. Adjust
            font, colour, size, and position only.
          </p>
          {previewMode && (
            <p className="rounded bg-background/80 px-2 py-1 font-medium text-xs text-foreground">
              Preview: {canvasPreview || "—"}
            </p>
          )}
        </div>
      )}

      {!isBoundField && (
        <textarea
          ref={textareaRef}
          value={raw}
          rows={3}
          placeholder="Enter text for this layer…"
          aria-label="Edit text content"
          className={cn(
            "w-full resize-y rounded-lg border border-border bg-background px-2.5 py-2",
            "text-sm leading-snug text-foreground outline-none",
            "placeholder:text-muted-foreground/70",
            "focus:border-primary focus:ring-2 focus:ring-primary/30",
          )}
          style={{
            fontFamily: el.fontFamily ?? "Outfit, system-ui, sans-serif",
            fontSize: previewSize,
            fontWeight: el.fontStyle?.includes("bold") ? 700 : 400,
            fontStyle: el.fontStyle?.includes("italic") ? "italic" : "normal",
            color: el.fill?.startsWith("#") ? el.fill : undefined,
            textAlign: el.align ?? "left",
            textDecoration: el.textDecoration,
          }}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") e.currentTarget.blur();
          }}
        />
      )}

      {!isBoundField && el.textCase && el.textCase !== "none" ? (
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          On canvas:{" "}
          <span className="font-medium text-foreground">
            {applyTextCase(raw || "…", el.textCase)}
          </span>
        </p>
      ) : null}

      <p className="text-[10px] text-muted-foreground">
        Font &amp; color → toolbar above the canvas
      </p>
    </EditorSelectionSection>
  );
}
