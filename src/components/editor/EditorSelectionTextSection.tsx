"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/core/utils/cn";
import { applyTextCase, estimateTextWidth, getEditableText } from "./editor-utils";
import { EditorSelectionSection } from "./EditorSelectionSection";
import { FEST_ADMIN_FIELDS } from "./poster-editor-config";
import type { PosterEditorState } from "./use-poster-editor-state";

function festFieldLabel(bindingKey: string) {
  return FEST_ADMIN_FIELDS.find((f) => f.key === bindingKey)?.label ?? bindingKey;
}

export function EditorSelectionTextSection({
  editor,
}: {
  editor: PosterEditorState;
}) {
  const { selectedElement, updateElement, previewMode } = editor;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textId =
    selectedElement?.type === "text" ? selectedElement.id : null;

  useEffect(() => {
    if (!textId) return;
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, [textId]);

  if (!selectedElement || selectedElement.type !== "text") return null;

  const el = selectedElement;
  const raw = getEditableText(el);
  const bindingLabel = el.bindingKey ? festFieldLabel(el.bindingKey) : null;
  const fontSize = el.fontSize ?? 24;
  const previewSize = Math.min(16, fontSize * 0.5);

  const handleChange = (value: string) => {
    updateElement(el.id, {
      text: value,
      width: estimateTextWidth(value, fontSize),
    });
  };

  return (
    <EditorSelectionSection title="Text content" className="border-b border-border pb-2.5">
      {bindingLabel && (
        <p className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
          Linked field: {bindingLabel}
        </p>
      )}

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

      {(previewMode && el.bindingKey) || (el.textCase && el.textCase !== "none") ? (
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {previewMode && el.bindingKey && (
            <>Preview mode shows sample data on the canvas. </>
          )}
          {el.textCase && el.textCase !== "none" && (
            <>
              On canvas:{" "}
              <span className="font-medium text-foreground">
                {applyTextCase(raw || "…", el.textCase)}
              </span>
            </>
          )}
        </p>
      ) : null}

      <p className="text-[10px] text-muted-foreground">
        Font &amp; color → toolbar above the canvas
      </p>
    </EditorSelectionSection>
  );
}
