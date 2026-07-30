"use client";

import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import { EDITOR_COLORS } from "./editor-theme";
import type { EditorElement } from "./poster-editor-types";

function parseKonvaFontStyle(fontStyle?: string) {
  const s = fontStyle ?? "";
  return {
    fontWeight: s.includes("bold") ? 700 : 400,
    fontStyle: s.includes("italic") ? "italic" : "normal",
  };
}

export interface InlineTextEditorLayout {
  left: number;
  top: number;
  width: number;
  minHeight: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  fontStyle: string;
  color: string;
  textAlign: "left" | "center" | "right" | "justify";
  lineHeight: number;
  letterSpacing: number;
  rotation: number;
  textDecoration?: string;
  opacity: number;
}

export function measureInlineTextEditorLayout(
  el: EditorElement,
  stage: Konva.Stage,
  hostEl: HTMLElement,
  zoom: number,
  textWidth: number,
): InlineTextEditorLayout | null {
  const node = stage.findOne(`#${el.id}`);
  if (!node) return null;

  const box = node.getClientRect({ relativeTo: stage });
  const host = hostEl.getBoundingClientRect();
  const stageBox = stage.container().getBoundingClientRect();
  const fontSize = el.fontSize ?? 24;
  const lineHeight = el.lineHeight ?? 1.2;

  return {
    left: stageBox.left - host.left + box.x,
    top: stageBox.top - host.top + box.y,
    width: Math.max(textWidth * zoom, box.width, 48),
    minHeight: Math.max(box.height, fontSize * zoom * lineHeight * 1.1),
    fontSize: fontSize * zoom,
    fontFamily: el.fontFamily ?? "Outfit, system-ui, sans-serif",
    ...parseKonvaFontStyle(el.fontStyle),
    color: el.fill ?? EDITOR_COLORS.foreground,
    textAlign: el.align ?? "left",
    lineHeight,
    letterSpacing: el.letterSpacing ?? 0,
    rotation: el.rotation ?? 0,
    textDecoration: el.textDecoration,
    opacity: el.opacity ?? 1,
  };
}

interface CanvasInlineTextEditorProps {
  element: EditorElement;
  value: string;
  layout: InlineTextEditorLayout;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

export function CanvasInlineTextEditor({
  element,
  value,
  layout,
  onCommit,
  onCancel,
}: CanvasInlineTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const snapshotRef = useRef(value);
  const [draft, setDraft] = useState(value);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = `${Math.max(layout.minHeight, ta.scrollHeight)}px`;
  }, [layout.minHeight]);

  useEffect(() => {
    snapshotRef.current = value;
    setDraft(value);
  }, [value, element.id]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    const len = ta.value.length;
    ta.setSelectionRange(len, len);
    autoResize();
  }, [autoResize]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    onCommit(trimmed.length > 0 ? draft : snapshotRef.current);
  }, [draft, onCommit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  };

  const deco = layout.textDecoration ?? "";
  const textDecoration = [
    deco.includes("underline") ? "underline" : "",
    deco.includes("line-through") ? "line-through" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          autoResize();
        }}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        aria-label={`Edit ${element.name}`}
        className="pointer-events-auto absolute z-30 resize-none overflow-hidden rounded-sm border-2 border-[#0d99ff] bg-white p-1 leading-[1.2] shadow-[0_2px_12px_rgba(0,0,0,0.12)] outline-none"
        style={{
          left: layout.left,
          top: layout.top,
          width: layout.width,
          minHeight: layout.minHeight,
          fontSize: layout.fontSize,
          fontFamily: layout.fontFamily,
          fontWeight: layout.fontWeight,
          fontStyle: layout.fontStyle,
          color: layout.color,
          textAlign: layout.textAlign,
          lineHeight: layout.lineHeight,
          letterSpacing: layout.letterSpacing,
          textDecoration: textDecoration || undefined,
          opacity: layout.opacity,
          transform: layout.rotation
            ? `rotate(${layout.rotation}deg)`
            : undefined,
          transformOrigin: "left top",
        }}
      />
      <div
        className="pointer-events-none absolute z-30 rounded-md bg-foreground/85 px-2 py-0.5 text-[10px] text-background shadow-sm"
        style={{
          left: layout.left,
          top: layout.top + layout.minHeight + 4,
        }}
      >
        Enter to finish · Shift+Enter for new line · Esc to cancel
      </div>
    </>
  );
}
