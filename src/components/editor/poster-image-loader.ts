import { useEffect, useState } from "react";
import type { PosterEditorDocument } from "./poster-editor-types";

// In-memory cache of preloaded HTMLImageElement instances.
const imageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement | null>>();

function shouldBypassCrossOrigin(url: string): boolean {
  return url.startsWith("data:") || url.startsWith("blob:");
}

/**
 * Preload a single image URL into cache and await its decode step.
 * Safe against concurrent calls for the same URL.
 */
export function preloadImage(url?: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);

  const cached = imageCache.get(url);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }

  const existing = loadingPromises.get(url);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new window.Image();
    if (!shouldBypassCrossOrigin(url)) {
      img.crossOrigin = "anonymous";
    }

    const onDone = async () => {
      try {
        if ("decode" in img) {
          await img.decode();
        }
      } catch {
        // decode failed or unsupported, image is still loaded
      }
      imageCache.set(url, img);
      loadingPromises.delete(url);
      resolve(img);
    };

    img.onload = () => {
      void onDone();
    };

    img.onerror = () => {
      // If anonymous CORS failed, retry without crossOrigin so it can at least display
      if (img.crossOrigin === "anonymous") {
        const fallback = new window.Image();
        fallback.onload = () => {
          imageCache.set(url, fallback);
          loadingPromises.delete(url);
          resolve(fallback);
        };
        fallback.onerror = () => {
          loadingPromises.delete(url);
          resolve(null);
        };
        fallback.src = url;
      } else {
        loadingPromises.delete(url);
        resolve(null);
      }
    };

    img.src = url;
  });

  loadingPromises.set(url, promise);
  return promise;
}

/** Extract all image URLs from a poster document (background, elements, QR logo). */
export function extractDocImageUrls(doc: PosterEditorDocument): string[] {
  const urls: string[] = [];

  if (doc.background?.type === "image" && doc.background.imageUrl) {
    urls.push(doc.background.imageUrl);
  }

  if (Array.isArray(doc.elements)) {
    for (const el of doc.elements) {
      if (el.type === "image" && el.imageUrl) {
        urls.push(el.imageUrl);
      } else if (el.type === "qr" && el.qrLogoUrl) {
        urls.push(el.qrLogoUrl);
      }
    }
  }

  return [...new Set(urls)];
}

/** Preload all image assets present in a poster document. */
export async function preloadDocImages(
  doc: PosterEditorDocument,
): Promise<void> {
  const urls = extractDocImageUrls(doc);
  if (urls.length === 0) return;
  await Promise.allSettled(urls.map((u) => preloadImage(u)));
}

/**
 * React hook to get a cached HTMLImageElement for Konva.
 * If the image is already cached/preloaded, returns synchronously on the first render
 * with zero blank frames or missing image glitches.
 */
export function useKonvaImage(url?: string): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(() => {
    if (!url) return null;
    const hit = imageCache.get(url);
    if (hit && hit.complete && hit.naturalWidth > 0) return hit;
    return null;
  });

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }

    const hit = imageCache.get(url);
    if (hit && hit.complete && hit.naturalWidth > 0) {
      setImage(hit);
      return;
    }

    let active = true;
    preloadImage(url).then((img) => {
      if (active) setImage(img);
    });

    return () => {
      active = false;
    };
  }, [url]);

  return image;
}

/** Configure 2D canvas context for high-fidelity image smoothing. */
export function applyHighQualitySmoothing(
  ctx: CanvasRenderingContext2D | null | undefined,
): void {
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}
