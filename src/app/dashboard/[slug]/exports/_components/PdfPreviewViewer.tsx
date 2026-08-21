"use client";

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";

/**
 * PDF preview rendered with pdfjs-dist loaded at runtime from a CDN script
 * tag. This bypasses webpack entirely — bundling pdfjs-dist 5.x through
 * webpack 5 (Next.js 16) triggers an `Object.defineProperty called on
 * non-object` runtime error. Loading the lib via CDN avoids the bundler
 * and gives us full control over rendering and the toolbar.
 */

// pdfjs-dist 4.x is the last version known to work reliably across browsers
// without ESM-only quirks. Pinned here so the script + worker always match.
const PDFJS_VERSION = "4.8.69";
const PDFJS_MAIN_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`;
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

type PdfjsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { url?: string; data?: ArrayBuffer }) => {
    promise: Promise<PdfDocument>;
  };
};
type PdfDocument = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
  destroy?: () => void;
};
type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void>; cancel?: () => void };
};

declare global {
  interface Window {
    pdfjsLib?: PdfjsLib;
  }
}

let pdfjsScriptPromise: Promise<void> | null = null;
function ensurePdfjsLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.pdfjsLib) return Promise.resolve();
  if (pdfjsScriptPromise) return pdfjsScriptPromise;
  pdfjsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-pdfjs="${PDFJS_VERSION}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load pdf.js")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = PDFJS_MAIN_URL;
    script.async = true;
    script.dataset.pdfjs = PDFJS_VERSION;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load pdf.js"));
    document.head.appendChild(script);
  });
  return pdfjsScriptPromise;
}

interface Props {
  blobUrl: string;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 2;
const SCALE_STEP = 0.25;

export function PdfPreviewViewer({ blobUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const docRef = useRef<PdfDocument | null>(null);

  // Load pdfjs once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensurePdfjsLoaded();
        if (cancelled) return;
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        }
        setPdfReady(true);
      } catch (e) {
        if (cancelled) return;
        setLoadError(
          e instanceof Error ? e.message : "Failed to load PDF viewer",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load document when blobUrl changes (and pdfjs is ready).
  useEffect(() => {
    if (!pdfReady || !blobUrl || !window.pdfjsLib) return;
    let cancelled = false;
    setNumPages(null);
    setPageNumber(1);
    setLoadError(null);

    (async () => {
      try {
        const task = window.pdfjsLib!.getDocument({ url: blobUrl });
        const doc = await task.promise;
        if (cancelled) {
          doc.destroy?.();
          return;
        }
        docRef.current = doc;
        setNumPages(doc.numPages);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Failed to load PDF");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blobUrl, pdfReady]);

  // Cleanup document
  useEffect(() => {
    return () => {
      const doc = docRef.current;
      if (doc) {
        doc.destroy?.();
        docRef.current = null;
      }
    };
  }, []);

  // Render current page.
  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || !numPages) return;
    let cancelled = false;
    let renderTask: { promise: Promise<void>; cancel?: () => void } | null =
      null;

    (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, viewport.width, viewport.height);
        renderTask = page.render({
          canvasContext: ctx,
          viewport,
        });
        await renderTask.promise;
      } catch (e) {
        if (cancelled) return;
        const message =
          e instanceof Error ? e.message : "Failed to render page";
        // Cancelled renders surface as a benign error; ignore.
        if (!/destroyed|cancelled/i.test(message)) {
          setLoadError(message);
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [pageNumber, scale, numPages]);

  const goPrev = () => setPageNumber((p) => Math.max(1, p - 1));
  const goNext = () =>
    setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p));
  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP));
  const reset = () => setScale(1);

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-destructive text-center">
        {loadError}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center gap-2 border-b px-4 py-2 bg-background">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goPrev}
          disabled={pageNumber <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium tabular-nums min-w-[6rem] text-center">
          {numPages ? (
            <>
              Page {pageNumber} of {numPages}
            </>
          ) : (
            "Loading…"
          )}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goNext}
          disabled={!numPages || pageNumber >= numPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="mx-3 h-5 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={zoomOut}
          disabled={scale <= MIN_SCALE}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={reset}
          className={cn(
            "text-xs font-medium tabular-nums min-w-[3rem] text-center px-2 py-1 rounded hover:bg-muted",
          )}
        >
          {Math.round(scale * 100)}%
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={zoomIn}
          disabled={scale >= MAX_SCALE}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto bg-muted/40">
        <div className="flex justify-center py-6">
          {!pdfReady || !numPages ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
              <Loader2 className="h-4 w-4 animate-spin" />
              {pdfReady ? "Loading PDF…" : "Loading PDF viewer…"}
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="shadow-md bg-white"
              aria-label={`PDF page ${pageNumber} of ${numPages}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
