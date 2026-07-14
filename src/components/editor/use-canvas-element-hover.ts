"use client";

import type Konva from "konva";
import { useCallback, useEffect, useState } from "react";
import type { EditorElement } from "./poster-editor-types";

export interface HoverBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ElementHoverHandlers = {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

const NO_HOVER_HANDLERS: ElementHoverHandlers = {
  onMouseEnter: () => {},
  onMouseLeave: () => {},
};

function hoverBoxEqual(a: HoverBox | null, b: HoverBox | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
  );
}

export function useCanvasElementHover({
  stageRef,
  interactive,
  selectedIds,
  isDragging,
  zoom,
  docUpdatedAt,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
  interactive: boolean;
  selectedIds: string[];
  isDragging: boolean;
  zoom: number;
  docUpdatedAt?: string;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverBox, setHoverBox] = useState<HoverBox | null>(null);

  const clearHover = useCallback(() => {
    setHoveredId(null);
    setHoverBox(null);
  }, []);

  useEffect(() => {
    if (!interactive || isDragging) {
      clearHover();
    }
  }, [interactive, isDragging, clearHover]);

  useEffect(() => {
    if (!interactive || isDragging || !hoveredId) {
      return;
    }
    if (selectedIds.includes(hoveredId)) {
      setHoverBox(null);
      return;
    }

    const measure = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const node = stage.findOne(`#${hoveredId}`);
      if (!node) {
        setHoverBox(null);
        return;
      }
      const relativeTo = node.getParent() ?? undefined;
      const box = node.getClientRect({
        relativeTo,
        skipShadow: true,
      });
      const next: HoverBox = {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      };
      setHoverBox((prev) => (hoverBoxEqual(prev, next) ? prev : next));
    };

    measure();
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [
    interactive,
    isDragging,
    hoveredId,
    selectedIds,
    stageRef,
    zoom,
    docUpdatedAt,
  ]);

  const makeHoverHandlers = useCallback(
    (el: EditorElement) => {
      if (!interactive) return NO_HOVER_HANDLERS;
      return {
        onMouseEnter: () => {
          if (el.locked) return;
          setHoveredId(el.id);
        },
        onMouseLeave: () => {
          setHoveredId((current) => (current === el.id ? null : current));
        },
      };
    },
    [interactive],
  );

  const showHoverRing =
    interactive &&
    !!hoverBox &&
    !!hoveredId &&
    !selectedIds.includes(hoveredId) &&
    !isDragging;

  return { hoverBox, showHoverRing, clearHover, makeHoverHandlers };
}
