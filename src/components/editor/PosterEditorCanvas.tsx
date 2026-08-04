"use client";

import type Konva from "konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  RegularPolygon,
  Stage,
  Text,
  Transformer,
} from "react-konva";
import { PosterElementRenderer } from "./PosterElementRenderer";
import { EditorCanvasGuides } from "./EditorCanvasGuides";
import { EditorTransformHud } from "./EditorTransformHud";
import { konvaShadowProps } from "./editor-konva-props";
import {
  idsInMarquee,
  type MarqueeBox,
  normalizeMarqueeBox,
} from "./editor-marquee-select";
import {
  computeSnapGuides,
  type ElementRect,
  elementToRect,
  isValidElementRect,
  rectAtPosition,
  type SnapGuideResult,
  unionRects,
} from "./editor-snap-guides";
import { EDITOR_COLORS } from "./editor-theme";
import { patchFromTransform, rectFromKonvaNode } from "./editor-transform-sync";
import { estimateTextWidth, getEditableText } from "./editor-utils";
import { applyEditorTransformerStyle } from "./konva-transformer-config";
import type { EditorElement } from "./poster-editor-types";
import {
  type ElementHoverHandlers,
  useCanvasElementHover,
} from "./use-canvas-element-hover";
import type {
  PosterEditorState,
  SelectionBounds,
} from "./use-poster-editor-state";
import { documentFontsFromElements, buildGoogleFontsCssUrl } from "./editor-font-catalog";
import { measureInlineTextEditorLayout, CanvasInlineTextEditor, type InlineTextEditorLayout } from "./inline-text-editor";

interface PosterEditorCanvasProps {
  editor: PosterEditorState;
  stageRef: React.RefObject<Konva.Stage | null>;
  /** fixed = artboard-sized host (for ruler alignment); centered = padded workspace */
  layout?: "centered" | "fixed";
  /** Read-only fullscreen preview — no selection or editing */
  presentMode?: boolean;
  /** Zoom override when presenting (fit-to-screen) */
  presentZoom?: number;
}

type ElementDragHandlers = {
  onDragStart: () => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
};

const NO_DRAG_HANDLERS: ElementDragHandlers = {
  onDragStart: () => {},
  onDragMove: () => {},
  onDragEnd: () => {},
};

function BackgroundImage({
  url,
  width,
  height,
}: {
  url: string;
  width: number;
  height: number;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = url;
  }, [url]);
  if (!image) return null;
  return <KonvaImage image={image} x={0} y={0} width={width} height={height} />;
}



function renderBackground(
  doc: NonNullable<PosterEditorState["doc"]>,
  width: number,
  height: number,
) {
  const bg = doc.background;
  if (bg.type === "gradient") {
    return (
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        listening={false}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: width, y: height }}
        fillLinearGradientColorStops={[
          0,
          bg.gradientFrom ?? EDITOR_COLORS.gradientFrom,
          1,
          bg.gradientTo ?? EDITOR_COLORS.gradientTo,
        ]}
      />
    );
  }
  if (bg.type === "solid") {
    return (
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={bg.color}
        listening={false}
      />
    );
  }
  if (bg.imageUrl) {
    return <BackgroundImage url={bg.imageUrl} width={width} height={height} />;
  }
  return (
    <Rect
      x={0}
      y={0}
      width={width}
      height={height}
      fill={EDITOR_COLORS.white}
      listening={false}
    />
  );
}

export function PosterEditorCanvas({
  editor,
  stageRef,
  layout = "centered",
  presentMode = false,
  presentZoom,
}: PosterEditorCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  


  // Disable browser context menu
  const transformerRef = useRef<Konva.Transformer>(null);
  const [guideState, setGuideState] = useState<SnapGuideResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [marquee, setMarquee] = useState<MarqueeBox | null>(null);
  const marqueeSessionRef = useRef<{
    startX: number;
    startY: number;
    shiftKey: boolean;
  } | null>(null);
  const skipClearClickRef = useRef(false);

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingLayout, setEditingLayout] = useState<InlineTextEditorLayout | null>(null);

  const {
    doc,
    selectedId,
    selectedIds,
    selectElement,
    selectElements,
    sortedElements,
    updateElement,
    displayText,
    previewMode,
    zoom,
    setSelectionBounds,
    formatPainterActive,
    copiedStyle,
    setFormatPainterActive,
    snapGuidesEnabled,
  } = editor;

  // Eagerly load fonts used in the current document so they render correctly on canvas
  useEffect(() => {
    if (!doc?.elements) return;
    const fonts = documentFontsFromElements(doc.elements).filter(f => f.googleFamily);
    for (const font of fonts) {
      const id = `greenroom-editor-font-${font.id}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = buildGoogleFontsCssUrl([font]);
        document.head.appendChild(link);
      }
    }
  }, [doc?.elements]);

  const interactive = !presentMode;
  const scale = presentZoom ?? zoom;

  const { hoverBox, showHoverRing, clearHover, makeHoverHandlers } =
    useCanvasElementHover({
      stageRef,
      interactive,
      selectedIds,
      isDragging,
      zoom: scale,
      docUpdatedAt: doc?.updatedAt,
    });

  const reportSelectionBounds = useCallback(() => {
    if (!hostRef.current || !stageRef.current || !selectedId) {
      setSelectionBounds(null);
      return;
    }
    const node = stageRef.current.findOne(`#${selectedId}`);
    if (!node) {
      setSelectionBounds(null);
      return;
    }
    const stage = stageRef.current;
    const box = node.getClientRect({
      relativeTo: stage,
      skipShadow: true,
    });
    const stageEl = stage.container();
    const stageBox = stageEl.getBoundingClientRect();
    const anchor =
      hostRef.current.closest("[data-canvas-viewport]") ?? hostRef.current;
    const anchorBox = anchor.getBoundingClientRect();
    const bounds: SelectionBounds = {
      left: stageBox.left - anchorBox.left + box.x,
      top: stageBox.top - anchorBox.top + box.y,
      width: box.width,
      height: box.height,
    };
    setSelectionBounds(bounds);
  }, [selectedId, setSelectionBounds, stageRef]);

  useEffect(() => {
    const tr = transformerRef.current;
    if (tr) applyEditorTransformerStyle(tr);
  }, []);

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage || !doc || !interactive) {
      transformerRef.current?.nodes([]);
      return;
    }
    const nodes = selectedIds
      .map((sid) => {
        const node = stage.findOne(`#${sid}`);
        const el = doc.elements.find((e) => e.id === sid);
        if (!node || el?.locked) return null;
        return node;
      })
      .filter((node): node is Konva.Node => node !== null);
    tr.nodes(nodes);
    if (nodes.length === 1 && doc) {
      const el = doc.elements.find((e) => e.id === selectedIds[0]);
      if (el?.type === "text") {
        tr.enabledAnchors([
          "middle-left",
          "middle-right",
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right",
        ]);
        tr.keepRatio(false);
      } else {
        applyEditorTransformerStyle(tr);
      }
    } else if (nodes.length > 0) {
      applyEditorTransformerStyle(tr);
    }
    tr.getLayer()?.batchDraw();
    requestAnimationFrame(reportSelectionBounds);
  }, [
    selectedIds,
    stageRef,
    reportSelectionBounds,
    sortedElements,
    zoom,
    doc,
    interactive,
  ]);

  useEffect(() => {
    const scrollEl = hostRef.current?.closest("[data-canvas-scroll]");
    const viewportEl = hostRef.current?.closest("[data-canvas-viewport]");
    if (!scrollEl && !viewportEl) return;

    const sync = () => requestAnimationFrame(reportSelectionBounds);
    scrollEl?.addEventListener("scroll", sync, { passive: true });

    const ro = new ResizeObserver(sync);
    if (viewportEl) ro.observe(viewportEl);
    if (scrollEl) ro.observe(scrollEl);

    return () => {
      scrollEl?.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [reportSelectionBounds, zoom]);

  const getStagePointer = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    return stage.getRelativePointerPosition();
  }, [stageRef]);

  const finishMarquee = useCallback(() => {
    const session = marqueeSessionRef.current;
    marqueeSessionRef.current = null;
    const end = getStagePointer();
    setMarquee(null);

    if (!session || !doc) return;

    const endX = end?.x ?? session.startX;
    const endY = end?.y ?? session.startY;
    const box = normalizeMarqueeBox(session.startX, session.startY, endX, endY);
    const dragged = box.width >= 4 || box.height >= 4;

    if (dragged) {
      skipClearClickRef.current = true;
      const ids = idsInMarquee(doc.elements, box);
      selectElements(ids, session.shiftKey);
      requestAnimationFrame(reportSelectionBounds);
      return;
    }
  }, [doc, getStagePointer, reportSelectionBounds, selectElements]);

  const isMarqueeSurfaceTarget = (target: Konva.Node) =>
    target.name() === "marquee-surface";

  const handleMarqueeSurfacePointerDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button !== 0) return;
      if (!isMarqueeSurfaceTarget(e.target)) return;
      const pos = getStagePointer();
      if (!pos) return;

      e.cancelBubble = true;
      clearHover();

      marqueeSessionRef.current = {
        startX: pos.x,
        startY: pos.y,
        shiftKey: e.evt.shiftKey,
      };
      setMarquee({ x: pos.x, y: pos.y, width: 0, height: 0 });

      const onMove = () => {
        const p = getStagePointer();
        const s = marqueeSessionRef.current;
        if (!p || !s) return;
        setMarquee(normalizeMarqueeBox(s.startX, s.startY, p.x, p.y));
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        finishMarquee();
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [clearHover, finishMarquee, getStagePointer],
  );

  const handleMarqueeSurfaceClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isMarqueeSurfaceTarget(e.target)) return;
      e.cancelBubble = true;
      if (skipClearClickRef.current) {
        skipClearClickRef.current = false;
        return;
      }
      selectElement(null);
      setSelectionBounds(null);
    },
    [selectElement, setSelectionBounds],
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (skipClearClickRef.current) {
        skipClearClickRef.current = false;
        return;
      }
      if (e.target === e.target.getStage()) {
        selectElement(null);
        setSelectionBounds(null);
      }
    },
    [selectElement, setSelectionBounds],
  );

  const isShiftSelect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) =>
    "shiftKey" in e.evt && Boolean(e.evt.shiftKey);

  const handleElementSelect = useCallback(
    (el: EditorElement, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true;
      const additive = isShiftSelect(e);

      if (formatPainterActive && copiedStyle) {
        updateElement(el.id, copiedStyle);
        setFormatPainterActive(false);
        selectElement(el.id);
        return;
      }

      if (additive) {
        selectElement(el.id, true);
        return;
      }

      selectElement(el.id);
    },
    [
      copiedStyle,
      formatPainterActive,
      selectElement,
      setFormatPainterActive,
      updateElement,
    ],
  );

  const notifyBounds = useCallback(() => {
    requestAnimationFrame(reportSelectionBounds);
  }, [reportSelectionBounds]);

  const setGuidesForRect = useCallback(
    (rect: ElementRect) => {
      if (!doc || selectedIds.length === 0) {
        setGuideState(null);
        return;
      }
      setGuideState(
        computeSnapGuides(
          doc.width,
          doc.height,
          rect,
          doc.elements,
          selectedIds,
          { enabled: snapGuidesEnabled },
        ),
      );
    },
    [doc, selectedIds, snapGuidesEnabled],
  );

  const applyDragSnap = useCallback(
    (node: Konva.Node, elId: string) => {
      if (!doc) return { x: node.x(), y: node.y() };
      let x = node.x();
      let y = node.y();
      const el = doc.elements.find((e) => e.id === elId);
      const measured = rectFromKonvaNode(node);
      const box = isValidElementRect(measured)
        ? measured
        : el
          ? elementToRect(el)
          : measured;
      if (!isValidElementRect(box)) {
        return { x: node.x(), y: node.y() };
      }
      const snapped = computeSnapGuides(
        doc.width,
        doc.height,
        box,
        doc.elements,
        [elId],
        { enabled: snapGuidesEnabled },
      );
      if (snapped.snapX !== undefined) {
        x = snapped.snapX;
        node.x(x);
      }
      if (snapped.snapY !== undefined) {
        y = snapped.snapY;
        node.y(y);
      }
      setGuideState(snapped);
      return { x, y };
    },
    [doc, snapGuidesEnabled],
  );

  const makeDragHandlers = useCallback(
    (el: EditorElement) => ({
      onDragStart: () => {
        clearHover();
        setIsDragging(true);
        setGuidesForRect(elementToRect(el));
      },
      onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
        const { x, y } = applyDragSnap(e.target, el.id);
        updateElement(el.id, { x, y }, false);
        notifyBounds();
      },
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        const { x, y } = applyDragSnap(e.target, el.id);
        updateElement(el.id, { x, y }, true);
        setIsDragging(false);
        notifyBounds();
      },
    }),
    [applyDragSnap, clearHover, notifyBounds, setGuidesForRect, updateElement],
  );

  const refreshIdleGuides = useCallback(() => {
    if (!doc || selectedIds.length === 0) {
      setGuideState(null);
      return;
    }
    const stage = stageRef.current;
    const konvaRects = stage
      ? selectedIds
          .map((id) => {
            const node = stage.findOne(`#${id}`);
            if (!node) return null;
            const rect = rectFromKonvaNode(node);
            return isValidElementRect(rect) ? rect : null;
          })
          .filter((r): r is ElementRect => r !== null)
      : [];
    const dataRects = selectedIds
      .map((id) => doc.elements.find((e) => e.id === id))
      .filter((el): el is EditorElement => !!el)
      .map(elementToRect);
    const union =
      unionRects(konvaRects.length > 0 ? konvaRects : dataRects) ?? null;
    if (union && isValidElementRect(union)) {
      setGuideState(
        computeSnapGuides(
          doc.width,
          doc.height,
          union,
          doc.elements,
          selectedIds,
          { enabled: snapGuidesEnabled },
        ),
      );
    }
  }, [doc, selectedIds, snapGuidesEnabled, stageRef]);

  useEffect(() => {
    if (!doc || selectedIds.length === 0) {
      setGuideState(null);
      return;
    }
    if (isDragging || isTransforming) return;

    const id = requestAnimationFrame(() => {
      refreshIdleGuides();
    });
    return () => cancelAnimationFrame(id);
  }, [
    doc,
    doc?.updatedAt,
    selectedIds,
    isDragging,
    isTransforming,
    snapGuidesEnabled,
    refreshIdleGuides,
    zoom,
    scale,
  ]);

  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr || !doc || !interactive) return;

    const onTransform = () => {
      setIsTransforming(true);
      const nodes = tr.nodes();
      if (nodes.length === 0) return;

      nodes.forEach((node, index) => {
        const id = selectedIds[index];
        if (!id) return;
        const el = doc.elements.find((e) => e.id === id);
        if (!el) return;
        updateElement(id, patchFromTransform(el, node), false);
      });

      const rects = nodes
        .map((n) => rectFromKonvaNode(n))
        .filter(isValidElementRect);
      const union = unionRects(rects);
      if (!union || !isValidElementRect(union)) return;

      const snapped = computeSnapGuides(
        doc.width,
        doc.height,
        union,
        doc.elements,
        selectedIds,
        { enabled: snapGuidesEnabled },
      );
      setGuideState(snapped);

      if (
        snapGuidesEnabled &&
        nodes.length === 1 &&
        snapped.snapX !== undefined
      ) {
        nodes[0].x(snapped.snapX);
      }
      if (
        snapGuidesEnabled &&
        nodes.length === 1 &&
        snapped.snapY !== undefined
      ) {
        nodes[0].y(snapped.snapY);
      }

      notifyBounds();
    };

    const onTransformEnd = () => {
      setIsTransforming(false);
      const nodes = tr.nodes();
      nodes.forEach((node, index) => {
        const id = selectedIds[index];
        if (!id) return;
        const el = doc.elements.find((e) => e.id === id);
        if (!el) return;
        updateElement(id, patchFromTransform(el, node), true);
        node.scaleX(1);
        node.scaleY(1);
      });
      notifyBounds();
    };

    tr.on("transform", onTransform);
    tr.on("transformend", onTransformEnd);
    return () => {
      tr.off("transform", onTransform);
      tr.off("transformend", onTransformEnd);
    };
  }, [
    doc,
    selectedIds,
    notifyBounds,
    snapGuidesEnabled,
    stageRef,
    updateElement,
    interactive,
  ]);

  if (!doc) return null;

  const showGuides = interactive && snapGuidesEnabled && selectedIds.length > 0;
  const showSnapLines = showGuides;
  const showDistances = showGuides;
  const showHud =
    showGuides && selectedIds.length === 1 && (isDragging || isTransforming);
  const hudRotation =
    selectedId && stageRef.current
      ? (stageRef.current.findOne(`#${selectedId}`)?.rotation() ??
        doc.elements.find((e) => e.id === selectedId)?.rotation ??
        0)
      : 0;

  return (
    <div
      ref={hostRef}
      className={
        layout === "fixed"
          ? "relative shrink-0 overflow-visible"
          : "relative flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/40 p-8"
      }
    >
      <div
        className={
          layout === "fixed"
            ? "relative bg-white shadow-[0_2px_12px_rgba(0,0,0,0.12)]"
            : "relative shadow-[0_8px_40px_rgba(124,58,237,0.15)] ring-1 ring-border"
        }
        style={{
          width: doc.width * scale,
          height: doc.height * scale,
        }}
      >
        {interactive && (
          <EditorCanvasGuides
            guides={guideState}
            zoom={scale}
            showSnapLines={showSnapLines}
            showDistances={showDistances}
          />
        )}
        {interactive && (
          <EditorTransformHud
            guides={guideState}
            zoom={scale}
            rotation={hudRotation}
            visible={showHud}
          />
        )}
        <Stage
          ref={stageRef}
          width={doc.width * scale}
          height={doc.height * scale}
          scaleX={scale}
          scaleY={scale}
          onClick={interactive ? handleStageClick : undefined}
          onTap={interactive ? handleStageClick : undefined}
          onMouseLeave={interactive ? clearHover : undefined}
        >
          <Layer>
            <Group
              clipX={0}
              clipY={0}
              clipWidth={doc.width}
              clipHeight={doc.height}
            >
              {renderBackground(doc, doc.width, doc.height)}

              {interactive && (
                <Rect
                  name="marquee-surface"
                  x={0}
                  y={0}
                  width={doc.width}
                  height={doc.height}
                  fill="rgba(0,0,0,0.001)"
                  listening
                  onMouseDown={handleMarqueeSurfacePointerDown}
                  onClick={handleMarqueeSurfaceClick}
                  onTap={handleMarqueeSurfaceClick}
                />
              )}

              {sortedElements.map((el) => {
                if (!el.visible) return null;
                const draggable = interactive && !el.locked;
                const nodeOpacity = el.opacity ?? 1;
                const dragHandlers = interactive
                  ? makeDragHandlers(el)
                  : NO_DRAG_HANDLERS;
                const onSelect = interactive
                  ? (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) =>
                      handleElementSelect(el, e)
                  : undefined;
                const hoverHandlers = makeHoverHandlers(el);
                const onDblClick = interactive && el.type === "text" && hostRef.current && stageRef.current
                  ? () => {
                      const host = hostRef.current;
                      if (!host || !stageRef.current) return;
                      const tw = el.width ?? estimateTextWidth(getEditableText(el), el.fontSize ?? 24);
                      const layout = measureInlineTextEditorLayout(el, stageRef.current, host, scale, tw);
                      if (layout) {
                        setEditingTextId(el.id);
                        setEditingLayout(layout);
                        // Hide transformer while editing
                        if (transformerRef.current) {
                           transformerRef.current.nodes([]);
                        }
                      }
                    }
                  : undefined;

                return (
                  <PosterElementRenderer
                    key={el.id}
                    el={el}
                    interactive={interactive}
                    previewMode={previewMode}
                    draggable={draggable}
                    nodeOpacity={nodeOpacity}
                    displayText={el.type === "text" ? displayText(el) : ""}
                    onSelect={onSelect}
                    hoverHandlers={hoverHandlers}
                    dragHandlers={dragHandlers}
                    onBoundsChange={notifyBounds}
                    onDblClick={onDblClick}
                  />
                );
              })}

              {showHoverRing && hoverBox && (
                <Rect
                  name="element-hover-ring"
                  x={hoverBox.x}
                  y={hoverBox.y}
                  width={hoverBox.width}
                  height={hoverBox.height}
                  stroke={EDITOR_COLORS.selectionBlue}
                  strokeWidth={1}
                  fillEnabled={false}
                  listening={false}
                  perfectDrawEnabled={false}
                />
              )}

              {interactive && marquee && (
                <Rect
                  x={marquee.x}
                  y={marquee.y}
                  width={marquee.width}
                  height={marquee.height}
                  fill="rgba(124,58,237,0.1)"
                  stroke={EDITOR_COLORS.primary}
                  strokeWidth={1}
                  dash={[6, 4]}
                  listening={false}
                />
              )}
            </Group>

            {interactive && (
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 8 || newBox.height < 8) return oldBox;
                  return newBox;
                }}
              />
            )}
          </Layer>
        </Stage>
        {editingTextId && editingLayout && (() => {
           const el = doc.elements.find(e => e.id === editingTextId);
           if (!el || el.type !== "text") return null;
           return (
             <CanvasInlineTextEditor
               element={el}
               value={getEditableText(el)}
               layout={editingLayout}
               onCommit={(text) => {
                 updateElement(el.id, { text });
                 setEditingTextId(null);
                 setEditingLayout(null);
                 // Restore transformer
                 setTimeout(() => {
                   if (transformerRef.current && stageRef.current) {
                     const node = stageRef.current.findOne(`#${el.id}`);
                     if (node) transformerRef.current.nodes([node]);
                   }
                 }, 0);
               }}
               onCancel={() => {
                 setEditingTextId(null);
                 setEditingLayout(null);
                 // Restore transformer
                 setTimeout(() => {
                   if (transformerRef.current && stageRef.current) {
                     const node = stageRef.current.findOne(`#${el.id}`);
                     if (node) transformerRef.current.nodes([node]);
                   }
                 }, 0);
               }}
             />
           );
        })()}
      </div>
    </div>
  );
}
