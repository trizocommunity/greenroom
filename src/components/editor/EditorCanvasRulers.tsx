"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  EDITOR_RULER_BG,
  EDITOR_RULER_SIZE,
  EDITOR_VERTICAL_RULER_WIDTH,
  EDITOR_WORKSPACE_BG,
} from "./editor-chrome";
import { useCanvasViewportWheel } from "./use-canvas-viewport-wheel";

export { EDITOR_RULER_SIZE } from "./editor-chrome";

const RULER_TICK = "#7c8494";
const RULER_TEXT = "#5c6474";
const RULER_FONT = "7px";
const RULER_MAJOR_TICK_H = 4;
const RULER_MINOR_TICK = 2;

function pickMajorStep(docLength: number) {
  if (docLength <= 300) return 50;
  if (docLength <= 700) return 100;
  return 200;
}

function buildMajorTicks(length: number, step: number) {
  const ticks: number[] = [];
  for (let i = 0; i <= length + step; i += step) ticks.push(i);
  return ticks;
}

function buildMinorTicks(length: number, major: number) {
  const minor = major / 2;
  if (minor < 10) return [];
  const ticks: number[] = [];
  for (let i = 0; i <= length + minor; i += minor) {
    if (i % major !== 0) ticks.push(i);
  }
  return ticks;
}

function HorizontalRuler({
  docWidth,
  scale,
  viewportWidth,
  offsetX,
}: {
  docWidth: number;
  scale: number;
  viewportWidth: number;
  offsetX: number;
}) {
  const major = pickMajorStep(docWidth);
  const majors = useMemo(
    () => buildMajorTicks(docWidth, major),
    [docWidth, major],
  );
  const minors = useMemo(
    () => buildMinorTicks(docWidth, major),
    [docWidth, major],
  );

  return (
    <div
      className="relative min-w-0 flex-1 overflow-hidden border-b border-black/10"
      style={{ height: EDITOR_RULER_SIZE, backgroundColor: EDITOR_RULER_BG }}
    >
      {minors.map((tick) => {
        const left = offsetX + tick * scale;
        if (left < -1 || left > viewportWidth + 1) return null;
        return (
          <span
            key={`m-${tick}`}
            className="absolute bottom-0 w-px"
            style={{
              left,
              height: RULER_MINOR_TICK,
              backgroundColor: RULER_TICK,
            }}
          />
        );
      })}
      {majors.map((tick) => {
        const left = offsetX + tick * scale;
        if (left < -1 || left > viewportWidth + 1) return null;
        return (
          <div
            key={tick}
            className="absolute bottom-0 flex items-end gap-px pl-px"
            style={{ left, transform: "translateX(-50%)" }}
          >
            <span
              className="font-medium leading-none tabular-nums"
              style={{ color: RULER_TEXT, fontSize: RULER_FONT }}
            >
              {tick}
            </span>
            <span
              className="w-px shrink-0"
              style={{
                height: RULER_MAJOR_TICK_H,
                backgroundColor: RULER_TICK,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function VerticalRuler({
  docHeight,
  scale,
  viewportHeight,
  offsetY,
}: {
  docHeight: number;
  scale: number;
  viewportHeight: number;
  offsetY: number;
}) {
  const major = pickMajorStep(docHeight);
  const majors = useMemo(
    () => buildMajorTicks(docHeight, major),
    [docHeight, major],
  );
  const minors = useMemo(
    () => buildMinorTicks(docHeight, major),
    [docHeight, major],
  );

  return (
    <div
      className="relative shrink-0 overflow-hidden border-r border-black/10"
      style={{
        width: EDITOR_VERTICAL_RULER_WIDTH,
        height: viewportHeight,
        backgroundColor: EDITOR_RULER_BG,
      }}
    >
      {minors.map((tick) => {
        const top = offsetY + tick * scale;
        if (top < -1 || top > viewportHeight + 1) return null;
        return (
          <span
            key={`m-${tick}`}
            className="absolute right-0 h-px"
            style={{
              top,
              width: RULER_MINOR_TICK,
              backgroundColor: RULER_TICK,
            }}
          />
        );
      })}
      {majors.map((tick) => {
        const top = offsetY + tick * scale;
        if (top < -1 || top > viewportHeight + 1) return null;
        return (
          <div
            key={tick}
            className="absolute right-0 flex items-center justify-end"
            style={{ top, transform: "translateY(-50%)" }}
          >
            <span
              className="shrink-0 font-medium leading-none tabular-nums"
              style={{
                color: RULER_TEXT,
                fontSize: RULER_FONT,
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                letterSpacing: "-0.02em",
              }}
            >
              {tick}
            </span>
            <span
              className="shrink-0 w-px"
              style={{
                height: RULER_MAJOR_TICK_H,
                backgroundColor: RULER_TICK,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function EditorCanvasRulers({
  width,
  height,
  scale,
  visible,
  enabled,
  setZoom,
  children,
}: {
  width: number;
  height: number;
  scale: number;
  visible: boolean;
  enabled: boolean;
  setZoom: (value: number | ((prev: number) => number)) => void;
  children: ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });

  useCanvasViewportWheel(scrollRef, enabled, setZoom);

  const scaledW = width * scale;
  const scaledH = height * scale;

  const scrollContentW = Math.max(
    viewportSize.w + scaledW,
    scaledW + viewportSize.w * 1.25,
  );
  const scrollContentH = Math.max(
    viewportSize.h + scaledH,
    scaledH + viewportSize.h * 1.25,
  );

  const artboardLeft = (scrollContentW - scaledW) / 2;
  const artboardTop = (scrollContentH - scaledH) / 2;

  const rulerOffsetX = artboardLeft - scrollPos.left;
  const rulerOffsetY = artboardTop - scrollPos.top;

  const syncViewportSize = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setViewportSize({ w: el.clientWidth, h: el.clientHeight });
  }, []);

  const centerScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const left = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
    const top = Math.max(0, (el.scrollHeight - el.clientHeight) / 2);
    el.scrollLeft = left;
    el.scrollTop = top;
    setScrollPos({ left, top });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    syncViewportSize();
    const ro = new ResizeObserver(syncViewportSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncViewportSize, visible]);

  useEffect(() => {
    centerScroll();
  }, [centerScroll, width, height, scale, viewportSize.w, viewportSize.h]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollPos({ left: el.scrollLeft, top: el.scrollTop });
  };

  const scrollSurface = (
    <div
      ref={viewportRef}
      className="relative min-h-0 min-w-0 flex-1"
      style={{ backgroundColor: EDITOR_WORKSPACE_BG }}
    >
      <div
        ref={scrollRef}
        className="h-full w-full overflow-auto [scrollbar-width:thin] [scrollbar-color:color-mix(in_oklch,var(--muted-foreground)_28%,transparent)_transparent] [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/25 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40"
        data-canvas-scroll
        onScroll={onScroll}
        title="Scroll to pan · Ctrl/Cmd + wheel to zoom"
      >
        <div
          className="relative"
          style={{
            width: scrollContentW,
            height: scrollContentH,
            minWidth: "100%",
            minHeight: "100%",
          }}
        >
          <div
            className="absolute"
            style={{
              left: artboardLeft,
              top: artboardTop,
              width: scaledW,
              height: scaledH,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  if (!visible) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{ backgroundColor: EDITOR_WORKSPACE_BG }}
      >
        {scrollSurface}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{ backgroundColor: EDITOR_WORKSPACE_BG }}
    >
      <div className="flex shrink-0" style={{ height: EDITOR_RULER_SIZE }}>
        <div
          className="shrink-0 border-b border-r border-black/10"
          style={{
            width: EDITOR_VERTICAL_RULER_WIDTH,
            height: EDITOR_RULER_SIZE,
            backgroundColor: EDITOR_RULER_BG,
          }}
        />
        <HorizontalRuler
          docWidth={width}
          scale={scale}
          viewportWidth={viewportSize.w}
          offsetX={rulerOffsetX}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <VerticalRuler
          docHeight={height}
          scale={scale}
          viewportHeight={viewportSize.h}
          offsetY={rulerOffsetY}
        />
        {scrollSurface}
      </div>
    </div>
  );
}
