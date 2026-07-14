"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import type { PosterBindings } from "@/features/posters/services/poster-bindings.service";
import {
  adaptElementsToCanvasSize,
  clampCanvasDimension,
} from "./editor-canvas-size";
import {
  defaultDraftTabLabel,
  type EditorDraftTab,
  isTabDirty,
} from "./editor-draft-tab";
import {
  alignElementsToCanvas,
  alignElementsToEachOther,
  type CanvasAlign,
  cloneElementsForClipboard,
  flipElementPatch,
} from "./editor-element-actions";
import {
  getSavedTemplate,
  listSavedTemplates,
  deleteSavedTemplate as removeStoredTemplate,
  type SavedPosterTemplate,
  savePosterTemplate,
} from "./editor-template-storage";
import { EDITOR_COLORS } from "./editor-theme";
import {
  applyTextCase,
  type CopiedElementStyle,
  cloneDoc,
  extractStyle,
  normalizeColor,
} from "./editor-utils";
import {
  type CreatePresetOptions,
  type EditorNavPanel,
  FEST_ADMIN_FIELDS,
  MOCK_BINDINGS,
  type PosterTemplateType,
  TEMPLATE_TYPES,
} from "./poster-editor-config";
import { createPresetDocument } from "./poster-editor-presets";
import type {
  CustomFont,
  EditorBackground,
  EditorElement,
  PosterEditorDocument,
} from "./poster-editor-types";

export interface SelectionBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

const MAX_HISTORY = 50;

export function usePosterEditorState(options?: {
  /** Festival editor: real sample data; dev playground uses MOCK_BINDINGS. */
  previewBindings?: PosterBindings | null;
}) {
  const previewBindings = options?.previewBindings ?? null;
  const bindingSource = previewBindings ?? MOCK_BINDINGS;
  const [tabs, setTabs] = useState<EditorDraftTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(true);
  const [navPanel, setNavPanel] = useState<EditorNavPanel>("elements");
  const [zoom, setZoom] = useState(0.61);
  const [showRulers, setShowRulers] = useState(true);
  const [snapGuidesEnabled, setSnapGuidesEnabled] = useState(true);
  const [selectionBounds, setSelectionBounds] =
    useState<SelectionBounds | null>(null);
  const [copiedStyle, setCopiedStyle] = useState<CopiedElementStyle | null>(
    null,
  );
  const [formatPainterActive, setFormatPainterActive] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<SavedPosterTemplate[]>(
    [],
  );
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [clipboard, setClipboard] = useState<EditorElement[] | null>(null);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );
  const doc = activeTab?.doc ?? null;
  const past = activeTab?.past ?? [];
  const future = activeTab?.future ?? [];

  const patchActiveTab = useCallback(
    (
      patch:
        | Partial<EditorDraftTab>
        | ((tab: EditorDraftTab) => EditorDraftTab),
    ) => {
      if (!activeTabId) return;
      setTabs((list) =>
        list.map((t) => {
          if (t.id !== activeTabId) return t;
          return typeof patch === "function" ? patch(t) : { ...t, ...patch };
        }),
      );
    },
    [activeTabId],
  );

  const selectedId = selectedIds[selectedIds.length - 1] ?? null;

  const selectedElement = useMemo(
    () => doc?.elements.find((e) => e.id === selectedId) ?? null,
    [doc, selectedId],
  );

  const selectedElements = useMemo(
    () => doc?.elements.filter((e) => selectedIds.includes(e.id)) ?? [],
    [doc, selectedIds],
  );

  useEffect(() => {
    setSavedTemplates(listSavedTemplates());
  }, []);

  const refreshSavedTemplates = useCallback(() => {
    setSavedTemplates(listSavedTemplates());
  }, []);

  const isDirty = useMemo(() => {
    if (!activeTab) return false;
    return isTabDirty(activeTab);
  }, [activeTab]);

  const templateMeta = useMemo(
    () =>
      doc ? TEMPLATE_TYPES.find((t) => t.type === doc.templateType) : undefined,
    [doc],
  );

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const setDocWithHistory = useCallback(
    (recipe: (d: PosterEditorDocument) => PosterEditorDocument) => {
      patchActiveTab((tab) => ({
        ...tab,
        past: [...tab.past.slice(-(MAX_HISTORY - 1)), cloneDoc(tab.doc)],
        future: [],
        doc: recipe(tab.doc),
      }));
    },
    [patchActiveTab],
  );

  const undo = useCallback(() => {
    if (!activeTab || activeTab.past.length === 0) return;
    const previous = activeTab.past[activeTab.past.length - 1];
    patchActiveTab({
      past: activeTab.past.slice(0, -1),
      future: [cloneDoc(activeTab.doc), ...activeTab.future].slice(
        0,
        MAX_HISTORY,
      ),
      doc: cloneDoc(previous),
    });
  }, [activeTab, patchActiveTab]);

  const redo = useCallback(() => {
    if (!activeTab || activeTab.future.length === 0) return;
    const next = activeTab.future[0];
    patchActiveTab({
      future: activeTab.future.slice(1),
      past: [...activeTab.past, cloneDoc(activeTab.doc)],
      doc: cloneDoc(next),
    });
  }, [activeTab, patchActiveTab]);

  const selectElement = useCallback((id: string | null, additive = false) => {
    if (!id) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds((ids) => {
      if (additive) {
        return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      }
      return [id];
    });
  }, []);

  const selectElements = useCallback((ids: string[], additive = false) => {
    if (ids.length === 0) {
      if (!additive) {
        setSelectedIds([]);
      }
      return;
    }
    setSelectedIds((prev) => {
      if (additive) {
        return [...new Set([...prev, ...ids])];
      }
      return ids;
    });
  }, []);

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    setSelectedIds([]);
    setSelectionBounds(null);
  }, []);

  const closeTab = useCallback(
    (tabId?: string) => {
      const target = tabId ?? activeTabId;
      if (!target) return;
      setTabs((list) => {
        const idx = list.findIndex((t) => t.id === target);
        const next = list.filter((t) => t.id !== target);
        if (activeTabId === target) {
          const newActive =
            next[Math.min(idx, Math.max(0, next.length - 1))]?.id ?? null;
          setActiveTabId(newActive);
        }
        return next;
      });
      setSelectedIds([]);
      setSelectionBounds(null);
    },
    [activeTabId],
  );

  const startTemplate = useCallback(
    (type: PosterTemplateType, options: CreatePresetOptions = {}) => {
      const next = createPresetDocument(type, options);
      const tab: EditorDraftTab = {
        id: uuid(),
        label: defaultDraftTabLabel(next),
        doc: next,
        past: [],
        future: [],
        savedBaseline: null,
      };
      setTabs((list) => [...list, tab]);
      setActiveTabId(tab.id);
      setSelectedIds([]);
      setPreviewMode(true);
      setNavPanel("elements");
      setZoom(type === "CANDIDATE_CARD" ? 0.87 : 0.61);
    },
    [],
  );

  const loadDocument = useCallback(
    (document: PosterEditorDocument, label?: string) => {
      const next = cloneDoc(document);
      const tab: EditorDraftTab = {
        id: uuid(),
        label: label ?? defaultDraftTabLabel(next),
        doc: next,
        past: [],
        future: [],
        savedBaseline: JSON.stringify(next),
      };
      setTabs([tab]);
      setActiveTabId(tab.id);
      setSelectedIds([]);
      setPreviewMode(true);
      setZoom(next.templateType === "CANDIDATE_CARD" ? 0.87 : 0.61);
    },
    [],
  );

  const restoreSavedDraft = useCallback(
    (document: PosterEditorDocument) => {
      if (!activeTab) return;
      const next = cloneDoc(document);
      patchActiveTab({
        past: [...activeTab.past, cloneDoc(activeTab.doc)],
        future: [],
        doc: next,
        savedBaseline: JSON.stringify(next),
        label: defaultDraftTabLabel(next),
      });
      setSelectedIds([]);
    },
    [activeTab, patchActiveTab],
  );

  const resetDocument = useCallback(() => {
    if (!doc || !activeTab) return;
    const next = createPresetDocument(
      doc.templateType,
      doc.createOptions ?? {},
    );
    patchActiveTab({
      past: [...activeTab.past, cloneDoc(activeTab.doc)],
      future: [],
      doc: next,
      savedBaseline: null,
      label: defaultDraftTabLabel(next),
    });
    setSelectedIds([]);
    toast.success("Factory layout applied");
  }, [activeTab, doc, patchActiveTab]);

  const closeTemplate = useCallback(() => {
    closeTab();
  }, [closeTab]);

  const updateBackground = useCallback(
    (background: EditorBackground) => {
      setDocWithHistory((d) => ({
        ...d,
        background,
        updatedAt: new Date().toISOString(),
      }));
    },
    [setDocWithHistory],
  );

  const resizeCanvas = useCallback(
    (width: number, height: number) => {
      const w = clampCanvasDimension(width);
      const h = clampCanvasDimension(height);
      setDocWithHistory((d) => {
        const elements = adaptElementsToCanvasSize(
          d.elements,
          d.width,
          d.height,
          w,
          h,
        );
        return {
          ...d,
          width: w,
          height: h,
          elements,
          updatedAt: new Date().toISOString(),
        };
      });
      toast.success(`Canvas resized to ${w} × ${h} px`);
    },
    [setDocWithHistory],
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<EditorElement>, recordHistory = true) => {
      const apply = recordHistory
        ? setDocWithHistory
        : (fn: (d: PosterEditorDocument) => PosterEditorDocument) =>
            patchActiveTab((tab) => ({ ...tab, doc: fn(tab.doc) }));
      apply((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        elements: d.elements.map((el) => {
          if (el.id !== id) return el;
          if (!el.bindingKey) return { ...el, ...patch };
          const {
            text: _text,
            bindingKey: _key,
            name: _name,
            ...stylePatch
          } = patch;
          return { ...el, ...stylePatch };
        }),
      }));
    },
    [setDocWithHistory, patchActiveTab],
  );

  const updateElements = useCallback(
    (ids: string[], patch: Partial<EditorElement>) => {
      setDocWithHistory((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        elements: d.elements.map((el) =>
          ids.includes(el.id) ? { ...el, ...patch } : el,
        ),
      }));
    },
    [setDocWithHistory],
  );

  const focusNewElements = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    setSelectionBounds(null);
  }, []);

  const addElement = useCallback(
    (element: Omit<EditorElement, "id" | "zIndex">) => {
      const newId = uuid();
      setDocWithHistory((d) => {
        const maxZ = d.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
        const el: EditorElement = {
          ...element,
          id: newId,
          zIndex: maxZ + 1,
        };
        return {
          ...d,
          updatedAt: new Date().toISOString(),
          elements: [...d.elements, el],
        };
      });
      focusNewElements([newId]);
    },
    [focusNewElements, setDocWithHistory],
  );

  const duplicateElement = useCallback(
    (id: string) => {
      const copyId = uuid();
      let created = false;
      setDocWithHistory((d) => {
        const source = d.elements.find((e) => e.id === id);
        if (!source) return d;
        created = true;
        const maxZ = d.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
        const copy: EditorElement = {
          ...source,
          id: copyId,
          name: `${source.name} copy`,
          x: source.x + 24,
          y: source.y + 24,
          zIndex: maxZ + 1,
          locked: false,
        };
        return {
          ...d,
          updatedAt: new Date().toISOString(),
          elements: [...d.elements, copy],
        };
      });
      if (created) {
        focusNewElements([copyId]);
      }
    },
    [focusNewElements, setDocWithHistory],
  );

  const removeElement = useCallback(
    (id: string) => {
      setDocWithHistory((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        elements: d.elements.filter((e) => e.id !== id),
      }));
      setSelectedIds((ids) => ids.filter((x) => x !== id));
    },
    [setDocWithHistory],
  );

  const removeSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    setDocWithHistory((d) => ({
      ...d,
      updatedAt: new Date().toISOString(),
      elements: d.elements.filter((e) => !selectedIds.includes(e.id)),
    }));
    setSelectedIds([]);
  }, [selectedIds, setDocWithHistory]);

  const moveLayer = useCallback(
    (id: string, direction: "up" | "down") => {
      setDocWithHistory((d) => {
        const sorted = [...d.elements].sort((a, b) => a.zIndex - b.zIndex);
        const idx = sorted.findIndex((e) => e.id === id);
        if (idx < 0) return d;
        const swapIdx = direction === "up" ? idx + 1 : idx - 1;
        if (swapIdx < 0 || swapIdx >= sorted.length) return d;
        const a = sorted[idx];
        const b = sorted[swapIdx];
        const elements = d.elements.map((el) => {
          if (el.id === a.id) return { ...el, zIndex: b.zIndex };
          if (el.id === b.id) return { ...el, zIndex: a.zIndex };
          return el;
        });
        return { ...d, elements, updatedAt: new Date().toISOString() };
      });
    },
    [setDocWithHistory],
  );

  const selectSimilar = useCallback(
    (mode: "type" | "color" | "font") => {
      if (!doc || !selectedElement) return;
      const matches = doc.elements.filter((el) => {
        if (mode === "type") return el.type === selectedElement.type;
        if (mode === "color")
          return (
            normalizeColor(el.fill) === normalizeColor(selectedElement.fill)
          );
        if (mode === "font")
          return (
            el.type === "text" &&
            selectedElement.type === "text" &&
            el.fontFamily === selectedElement.fontFamily
          );
        return false;
      });
      const ids = matches.map((e) => e.id);
      setSelectedIds(ids);
      toast.success(
        `Selected ${ids.length} layer${ids.length === 1 ? "" : "s"}`,
      );
    },
    [doc, selectedElement],
  );

  const copyFormat = useCallback(() => {
    if (!selectedElement) return;
    setCopiedStyle(extractStyle(selectedElement));
    setFormatPainterActive(true);
    toast.success("Format copied — click another layer to apply");
  }, [selectedElement]);

  const applyFormatToSelected = useCallback(() => {
    if (!copiedStyle || selectedIds.length === 0) return;
    updateElements(selectedIds, copiedStyle);
    setFormatPainterActive(false);
    toast.success("Format applied");
  }, [copiedStyle, selectedIds, updateElements]);

  const toggleLock = useCallback(() => {
    if (selectedIds.length === 0) return;
    const anyLocked = selectedIds.some(
      (id) => doc?.elements.find((e) => e.id === id)?.locked,
    );
    updateElements(selectedIds, { locked: !anyLocked });
  }, [doc?.elements, selectedIds, updateElements]);

  const addFestField = useCallback(
    (bindingKey: string) => {
      if (!doc) return;
      const field = FEST_ADMIN_FIELDS.find((f) => f.key === bindingKey);
      if (!field) return;
      const preview = bindingSource[bindingKey] ?? field.preview;
      addElement({
        type: bindingKey === "qrCode" ? "qr" : "text",
        name: field.label,
        bindingKey,
        visible: true,
        x: 120,
        y: 120,
        width: bindingKey === "qrCode" ? 180 : undefined,
        height: bindingKey === "qrCode" ? 180 : undefined,
        text: bindingKey === "qrCode" ? undefined : preview,
        fontSize: 28,
        fontFamily: "Outfit, system-ui, sans-serif",
        fill: EDITOR_COLORS.foreground,
        stroke:
          bindingKey === "qrCode" ? EDITOR_COLORS.mutedForeground : undefined,
        strokeWidth: bindingKey === "qrCode" ? 2 : undefined,
        align: "left",
        opacity: 1,
      });
    },
    [addElement, doc],
  );

  const addShape = useCallback(
    (type: "rect" | "circle" | "triangle" | "line") => {
      const base = { visible: true, x: 200, y: 200, zIndex: 0, opacity: 1 };
      if (type === "rect") {
        addElement({
          ...base,
          type: "rect",
          name: "Rectangle",
          width: 200,
          height: 120,
          fill: EDITOR_COLORS.primary,
          stroke: EDITOR_COLORS.primaryLight,
          strokeWidth: 2,
        });
      } else if (type === "circle") {
        addElement({
          ...base,
          type: "circle",
          name: "Circle",
          radius: 60,
          fill: `${EDITOR_COLORS.primary}33`,
          stroke: EDITOR_COLORS.primary,
          strokeWidth: 2,
        });
      } else if (type === "triangle") {
        addElement({
          ...base,
          type: "triangle",
          name: "Triangle",
          radius: 70,
          fill: `${EDITOR_COLORS.gradientTo}33`,
          stroke: EDITOR_COLORS.gradientTo,
          strokeWidth: 2,
        });
      } else {
        addElement({
          ...base,
          type: "line",
          name: "Line",
          points: [0, 0, 240, 0],
          stroke: EDITOR_COLORS.foreground,
          strokeWidth: 4,
        });
      }
    },
    [addElement],
  );

  const addTextBlock = useCallback(
    (variant: "heading" | "body") => {
      addElement({
        type: "text",
        name: variant === "heading" ? "Heading" : "Body text",
        visible: true,
        x: 160,
        y: 160,
        text: variant === "heading" ? "Heading" : "Body text goes here",
        fontSize: variant === "heading" ? 40 : 24,
        fontFamily: "Outfit, system-ui, sans-serif",
        fontStyle: variant === "heading" ? "bold" : "normal",
        fill: EDITOR_COLORS.foreground,
        align: "left",
        opacity: 1,
      });
    },
    [addElement],
  );

  const addImageFromFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      addElement({
        type: "image",
        name: file.name,
        visible: true,
        x: 100,
        y: 100,
        width: 280,
        height: 200,
        imageUrl: url,
        opacity: 1,
      });
    },
    [addElement],
  );

  const addCustomFont = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      const name = file.name.replace(/\.[^.]+$/, "");
      setDocWithHistory((d) => {
        const font: CustomFont = { id: uuid(), name, url };
        return {
          ...d,
          customFonts: [...d.customFonts, font],
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [setDocWithHistory],
  );

  const sortedElements = useMemo(() => {
    if (!doc) return [];
    return [...doc.elements].sort((a, b) => a.zIndex - b.zIndex);
  }, [doc]);

  const displayText = useCallback(
    (el: EditorElement) => {
      if (el.type === "qr")
        return previewMode ? (bindingSource.qrCode ?? "QR") : "QR";
      if (!el.text && !el.bindingKey) return "";
      let text = el.text ?? "";
      if (previewMode && el.bindingKey) {
        text = bindingSource[el.bindingKey] ?? el.text ?? "";
      }
      return applyTextCase(text, el.textCase);
    },
    [previewMode, bindingSource],
  );

  const fieldsForTemplate = useMemo(() => {
    if (!doc) return FEST_ADMIN_FIELDS;
    return FEST_ADMIN_FIELDS.filter((f) =>
      f.templateTypes.includes(doc.templateType),
    );
  }, [doc]);

  const fieldsSectionTitle = useMemo(() => {
    if (!doc) return "FestAdmin fields";
    if (doc.templateType === "CANDIDATE_CARD") return "Candidate card fields";
    return "FestAdmin fields";
  }, [doc]);

  const fieldsSectionHint = useMemo(() => {
    if (doc?.templateType === "CANDIDATE_CARD") {
      return "These fields are auto-filled when generating candidate cards.";
    }
    return null;
  }, [doc]);

  const toggleTextDecoration = useCallback(
    (part: "underline" | "line-through") => {
      if (!selectedElement || selectedElement.type !== "text") return;
      const current = selectedElement.textDecoration ?? "";
      const parts = new Set(
        current.split(" ").filter(Boolean) as Array<
          "underline" | "line-through"
        >,
      );
      if (parts.has(part)) parts.delete(part);
      else parts.add(part);
      const next =
        parts.size === 0
          ? undefined
          : (Array.from(parts).join(" ") as EditorElement["textDecoration"]);
      updateElement(selectedElement.id, { textDecoration: next });
    },
    [selectedElement, updateElement],
  );

  const toggleTextCase = useCallback(() => {
    if (!selectedElement || selectedElement.type !== "text") return;
    const order: EditorElement["textCase"][] = ["none", "upper", "lower"];
    const idx = order.indexOf(selectedElement.textCase ?? "none");
    updateElement(selectedElement.id, {
      textCase: order[(idx + 1) % order.length],
    });
  }, [selectedElement, updateElement]);

  const saveCurrentTemplate = useCallback(
    (name: string) => {
      if (!doc) return;
      try {
        const saved = savePosterTemplate(
          name,
          doc,
          doc.savedTemplateId ?? null,
        );
        const nextDoc = cloneDoc(saved.document);
        patchActiveTab({
          doc: nextDoc,
          savedBaseline: JSON.stringify(nextDoc),
          label: saved.name,
        });
        refreshSavedTemplates();
        toast.success(`Saved “${saved.name}”`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save template");
      }
    },
    [doc, patchActiveTab, refreshSavedTemplates],
  );

  const loadSavedTemplate = useCallback(
    (id: string) => {
      const item = getSavedTemplate(id);
      if (!item) {
        toast.error("Template not found");
        refreshSavedTemplates();
        return;
      }
      const nextDoc = cloneDoc(item.document);
      const tab: EditorDraftTab = {
        id: uuid(),
        label: item.name,
        doc: nextDoc,
        past: [],
        future: [],
        savedBaseline: JSON.stringify(nextDoc),
      };
      setTabs((list) => [...list, tab]);
      setActiveTabId(tab.id);
      setSelectedIds([]);
      setZoom(nextDoc.templateType === "CANDIDATE_CARD" ? 0.87 : 0.61);
      setNavPanel("elements");
      toast.success(`Opened “${item.name}”`);
    },
    [refreshSavedTemplates],
  );

  const deleteSavedTemplate = useCallback(
    (id: string) => {
      removeStoredTemplate(id);
      refreshSavedTemplates();
      if (doc?.savedTemplateId === id) {
        patchActiveTab({
          doc: { ...doc, savedTemplateId: null, templateName: undefined },
          savedBaseline: null,
        });
      }
      toast.success("Template deleted");
    },
    [doc, patchActiveTab, refreshSavedTemplates],
  );

  const copySelected = useCallback(() => {
    if (!doc || selectedIds.length === 0) return;
    setClipboard(cloneElementsForClipboard(doc.elements, selectedIds));
    toast.success(
      `Copied ${selectedIds.length} layer${selectedIds.length === 1 ? "" : "s"}`,
    );
  }, [doc, selectedIds]);

  const pasteClipboard = useCallback(() => {
    if (!clipboard?.length || !doc) return;
    const newIds = clipboard.map(() => uuid());
    setDocWithHistory((d) => {
      let maxZ = d.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
      const pasted = clipboard.map((el, i) => ({
        ...el,
        id: newIds[i],
        name: `${el.name} copy`,
        x: el.x + 20,
        y: el.y + 20,
        zIndex: ++maxZ,
        locked: false,
      }));
      return {
        ...d,
        updatedAt: new Date().toISOString(),
        elements: [...d.elements, ...pasted],
      };
    });
    focusNewElements(newIds);
    toast.success("Pasted");
  }, [clipboard, doc, focusNewElements, setDocWithHistory]);

  const duplicateSelected = useCallback(() => {
    if (!doc || selectedIds.length === 0) return;
    const createdIds: string[] = [];
    setDocWithHistory((d) => {
      let maxZ = d.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
      const copies: EditorElement[] = [];
      for (const id of selectedIds) {
        const source = d.elements.find((e) => e.id === id);
        if (!source) continue;
        const copyId = uuid();
        createdIds.push(copyId);
        copies.push({
          ...source,
          id: copyId,
          name: `${source.name} copy`,
          x: source.x + 24,
          y: source.y + 24,
          zIndex: ++maxZ,
          locked: false,
        });
      }
      return {
        ...d,
        updatedAt: new Date().toISOString(),
        elements: [...d.elements, ...copies],
      };
    });
    if (createdIds.length > 0) {
      focusNewElements(createdIds);
    }
  }, [doc, focusNewElements, selectedIds, setDocWithHistory]);

  const applyAlignPatches = useCallback(
    (patches: Partial<EditorElement>[]) => {
      setDocWithHistory((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        elements: d.elements.map((el) => {
          const patch = patches.find((p) => p.id === el.id);
          if (!patch) return el;
          return { ...el, ...patch };
        }),
      }));
    },
    [setDocWithHistory],
  );

  const alignSelected = useCallback(
    (align: CanvasAlign) => {
      if (!doc || selectedIds.length === 0) return;
      const patches = alignElementsToCanvas(
        doc.elements,
        selectedIds,
        doc.width,
        doc.height,
        align,
      );
      applyAlignPatches(patches);
    },
    [applyAlignPatches, doc, selectedIds],
  );

  const alignSelectedToEachOther = useCallback(
    (align: CanvasAlign) => {
      if (!doc || selectedIds.length < 2) return;
      const patches = alignElementsToEachOther(
        doc.elements,
        selectedIds,
        align,
      );
      applyAlignPatches(patches);
    },
    [applyAlignPatches, doc, selectedIds],
  );

  const flipSelected = useCallback(
    (axis: "horizontal" | "vertical") => {
      if (selectedIds.length === 0) return;
      setDocWithHistory((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        elements: d.elements.map((el) =>
          selectedIds.includes(el.id)
            ? { ...el, ...flipElementPatch(el, axis) }
            : el,
        ),
      }));
    },
    [selectedIds, setDocWithHistory],
  );

  const reorderSelected = useCallback(
    (position: "front" | "back" | "forward" | "backward") => {
      if (!doc || selectedIds.length === 0) return;
      setDocWithHistory((d) => {
        let sorted = [...d.elements].sort((a, b) => a.zIndex - b.zIndex);

        if (position === "front") {
          sorted = [
            ...sorted.filter((e) => !selectedIds.includes(e.id)),
            ...sorted.filter((e) => selectedIds.includes(e.id)),
          ];
        } else if (position === "back") {
          sorted = [
            ...sorted.filter((e) => selectedIds.includes(e.id)),
            ...sorted.filter((e) => !selectedIds.includes(e.id)),
          ];
        } else if (position === "forward") {
          for (let i = sorted.length - 2; i >= 0; i--) {
            if (
              selectedIds.includes(sorted[i].id) &&
              !selectedIds.includes(sorted[i + 1].id)
            ) {
              [sorted[i], sorted[i + 1]] = [sorted[i + 1], sorted[i]];
            }
          }
        } else {
          for (let i = 1; i < sorted.length; i++) {
            if (
              selectedIds.includes(sorted[i].id) &&
              !selectedIds.includes(sorted[i - 1].id)
            ) {
              [sorted[i], sorted[i - 1]] = [sorted[i - 1], sorted[i]];
            }
          }
        }

        const elements = sorted.map((el, i) => ({ ...el, zIndex: i + 1 }));
        return { ...d, elements, updatedAt: new Date().toISOString() };
      });
    },
    [doc, selectedIds, setDocWithHistory],
  );

  const nudgeSelected = useCallback(
    (dx: number, dy: number) => {
      if (selectedIds.length === 0) return;
      setDocWithHistory((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        elements: d.elements.map((el) =>
          selectedIds.includes(el.id)
            ? { ...el, x: el.x + dx, y: el.y + dy }
            : el,
        ),
      }));
    },
    [selectedIds, setDocWithHistory],
  );

  const defaultSaveName = useMemo(() => {
    if (!doc) return "";
    if (doc.templateName) return doc.templateName;
    const meta = TEMPLATE_TYPES.find((t) => t.type === doc.templateType);
    return meta ? `${meta.title} template` : "Untitled template";
  }, [doc]);

  const markDocumentSaved = useCallback(() => {
    if (!activeTab) return;
    patchActiveTab({
      savedBaseline: JSON.stringify(activeTab.doc),
    });
  }, [activeTab, patchActiveTab]);

  return {
    doc,
    tabs,
    activeTabId,
    switchTab,
    closeTab,
    showRulers,
    setShowRulers,
    snapGuidesEnabled,
    setSnapGuidesEnabled,
    templateMeta,
    selectedId,
    selectedIds,
    setSelectedId: selectElement,
    selectElement,
    selectElements,
    selectedElement,
    selectedElements,
    sortedElements,
    previewMode,
    setPreviewMode,
    navPanel,
    setNavPanel,
    zoom,
    setZoom,
    selectionBounds,
    setSelectionBounds,
    startTemplate,
    loadDocument,
    closeTemplate,
    restoreSavedDraft,
    resetDocument,
    updateBackground,
    resizeCanvas,
    updateElement,
    updateElements,
    removeElement,
    removeSelected,
    duplicateElement,
    moveLayer,
    addFestField,
    addShape,
    addTextBlock,
    addImageFromFile,
    addCustomFont,
    displayText,
    fieldsForTemplate,
    fieldsSectionTitle,
    fieldsSectionHint,
    undo,
    redo,
    canUndo,
    canRedo,
    selectSimilar,
    copyFormat,
    applyFormatToSelected,
    formatPainterActive,
    setFormatPainterActive,
    copiedStyle,
    toggleLock,
    toggleTextDecoration,
    toggleTextCase,
    savedTemplates,
    refreshSavedTemplates,
    saveModalOpen,
    setSaveModalOpen,
    saveCurrentTemplate,
    loadSavedTemplate,
    deleteSavedTemplate,
    isDirty,
    markDocumentSaved,
    defaultSaveName,
    copySelected,
    pasteClipboard,
    duplicateSelected,
    alignSelected,
    alignSelectedToEachOther,
    flipSelected,
    reorderSelected,
    nudgeSelected,
  };
}

export type PosterEditorState = ReturnType<typeof usePosterEditorState>;
