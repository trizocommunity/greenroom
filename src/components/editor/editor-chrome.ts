import type { CSSProperties } from "react";

/** Shared compact sizing for poster editor UI (desktop / tablet landscape only). */

/** Tailwind `lg` — editor is hidden below this width */
export const EDITOR_DESKTOP_MIN_PX = 1024;

export const editorBtnIcon = "h-7 w-7 shrink-0";
export const editorBtnSm = "h-7 shrink-0 gap-1 px-2 text-[11px] font-medium";
/** Single combined toolbar strip (context + tools). */
export const editorToolbarBar =
  "flex shrink-0 items-center gap-0 overflow-x-auto border-b border-border bg-card px-2 py-1 [scrollbar-width:thin]";
/** Segment inside the toolbar bar (no outer border/background). */
export const editorToolbarRow = "flex min-w-0 shrink-0 items-center gap-0.5";
export const editorInput = "h-7 text-xs shrink-0";
export const editorInputNarrow = "h-7 w-12 text-center text-xs shrink-0";
export const editorNavAside =
  "flex h-full w-16 shrink-0 flex-col items-center gap-0.5 border-r border-sidebar-border bg-sidebar py-2 xl:w-[4.5rem]";
export const editorPanelAside =
  "flex h-full min-h-0 w-full shrink-0 flex-col border-r border-border bg-card";

/** Selection overlay — absolute rounded dialogs (wireframe) */
export const EDITOR_SELECTION_PANEL_WIDTH_PX = 260;
export const editorSelectionDialogBase =
  "pointer-events-auto overflow-hidden rounded-xl border border-border bg-card shadow-xl";
export const editorSelectionPanelDialog =
  "absolute top-3 z-30 flex max-h-[min(85vh,calc(100%-24px))] max-w-[min(280px,30vw)] flex-col";
export const editorSelectionSectionLabel =
  "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";
/** Ultra-thin scrollbars for selection overlay dialogs */
export const editorSelectionScroll =
  "[scrollbar-width:thin] [scrollbar-color:color-mix(in_oklch,var(--muted-foreground)_22%,transparent)_transparent] [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/35";
export const editorSelectionToolbarDialog = `pointer-events-auto absolute top-3 left-1/2 z-30 flex w-max max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-1 overflow-x-auto overscroll-contain px-3 py-1.5 ${editorSelectionScroll}`;

export function selectionPanelDialogStyle(): CSSProperties {
  return {
    left: `calc(var(--editor-selection-dialog-inset) + var(--editor-selection-ruler-offset))`,
    width: "var(--editor-selection-panel-width)",
  };
}

/** Canvas workspace (behind artboard) — distinct from white artboard */
export const EDITOR_WORKSPACE_BG = "#d4d8e0";
export const EDITOR_RULER_BG = "#c8cdd6";
/** Horizontal ruler thickness and corner height (ultra-compact) */
export const EDITOR_RULER_SIZE = 12;
/** Vertical ruler width (vertical tick labels) */
export const EDITOR_VERTICAL_RULER_WIDTH = 14;

export const EDITOR_ZOOM_MIN = 0.25;
export const EDITOR_ZOOM_MAX = 2;
export const EDITOR_ZOOM_STEP = 0.05;

export function clampEditorZoom(value: number) {
  return Math.min(EDITOR_ZOOM_MAX, Math.max(EDITOR_ZOOM_MIN, value));
}
