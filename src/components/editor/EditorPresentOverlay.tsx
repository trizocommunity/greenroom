"use client";

import type Konva from "konva";
import { Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PosterEditorCanvas } from "./PosterEditorCanvas";
import type { PosterEditorState } from "./use-poster-editor-state";

export function EditorPresentOverlay({
  editor,
  onClose,
}: {
  editor: PosterEditorState;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const { doc } = editor;
  const [fitZoom, setFitZoom] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !doc) return;

    const calculateFit = () => {
      const pad = 48;
      const zw = (el.clientWidth - pad) / doc.width;
      const zh = (el.clientHeight - pad) / doc.height;
      setFitZoom(Math.min(zw, zh, 2));
    };

    calculateFit();
    const ro = new ResizeObserver(calculateFit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    void el.requestFullscreen?.().catch(() => {});

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (document.fullscreenElement === el) {
        void document.exitFullscreen?.().catch(() => {});
      }
    };
  }, [onClose]);

  if (!doc) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950"
      role="dialog"
      aria-label="Present full screen"
    >
      <PosterEditorCanvas
        editor={editor}
        stageRef={stageRef}
        layout="fixed"
        presentMode
        presentZoom={fitZoom}
      />

      <div className="pointer-events-auto absolute bottom-4 right-4 flex items-center gap-2">
        <span className="text-xs text-white/50">Esc to exit</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={onClose}
        >
          <Minimize2 className="h-4 w-4" />
          Exit
        </Button>
      </div>
    </div>
  );
}
