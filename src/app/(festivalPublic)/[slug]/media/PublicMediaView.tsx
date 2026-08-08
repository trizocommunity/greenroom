"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/festival/public/PublicSection";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { usePublicPages } from "@/features/festivals/hooks/use-public-pages";
import {
  extractYouTubeId,
  getYouTubeThumbnail,
} from "@/features/media/utils/youtube";

type ImageItem = { id: string; url: string; order: number };
type VideoItem = { id: string; url: string; order: number };

interface PublicMediaViewProps {
  /** Server-rendered first page of photos. */
  images: ImageItem[];
  /** Videos are few and always arrive whole with page 1. */
  videos: VideoItem[];
  total: number;
  hasMore: boolean;
  pageSize: number;
  festivalSlug: string;
  accentColor?: string;
}

const selectImages = (data: unknown) =>
  (data as { images: ImageItem[] }).images;

/**
 * Photos in a masonry column flow with no frames — the pictures are the
 * content, so they get the space that borders and card padding used to take.
 */
export function PublicMediaView({
  images: initialImages,
  videos,
  total,
  hasMore: initialHasMore,
  pageSize,
  festivalSlug,
  accentColor = "var(--primary)",
}: PublicMediaViewProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const {
    items: images,
    hasMore,
    isLoadingMore,
    error,
    loadMore,
    page,
    goToPage,
  } = usePublicPages<ImageItem>({
    endpoint: `/api/festivals/${festivalSlug}/media`,
    select: selectImages,
    pageSize,
    initial: {
      items: initialImages,
      total,
      page: 1,
      hasMore: initialHasMore,
    },
  });

  const close = useCallback(() => setLightboxIndex(null), []);
  const goPrev = useCallback(
    () =>
      setLightboxIndex((i) =>
        i === null ? null : i <= 0 ? images.length - 1 : i - 1,
      ),
    [images.length],
  );
  const goNext = useCallback(
    () =>
      setLightboxIndex((i) =>
        i === null ? null : i >= images.length - 1 ? 0 : i + 1,
      ),
    [images.length],
  );

  // Arrow keys move through the gallery; Radix already handles Escape.
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, goPrev, goNext]);

  if (images.length === 0 && videos.length === 0) {
    return <EmptyState>Nothing in the media yet.</EmptyState>;
  }

  return (
    <div className="space-y-14">
      {videos.length > 0 && (
        <section>
          <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Videos
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video, i) => {
              const videoId = extractYouTubeId(video.url);
              return (
                <motion.a
                  key={video.id}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: Math.min(i, 6) * 0.05 }}
                  className="group relative aspect-video overflow-hidden rounded-lg bg-muted"
                >
                  {videoId && (
                    <Image
                      src={getYouTubeThumbnail(videoId)}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 380px"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/15">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-black transition-transform group-hover:scale-110">
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </span>
                  </span>
                </motion.a>
              );
            })}
          </div>
        </section>
      )}

      {images.length > 0 && (
        <section>
          {videos.length > 0 && (
            <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Photos
            </h2>
          )}
          <div className="columns-2 gap-2.5 sm:columns-3 lg:columns-4 [&>*]:mb-2.5">
            {images.map((img, index) => (
              <motion.button
                key={img.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.4,
                  delay: Math.min(index, 10) * 0.03,
                }}
                onClick={() => setLightboxIndex(index)}
                aria-label={`Open photo ${index + 1}`}
                className="group relative block w-full overflow-hidden rounded-lg bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Image
                  src={img.url}
                  alt=""
                  width={600}
                  height={800}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              </motion.button>
            ))}
          </div>

          {Math.ceil(total / pageSize) > 1 && (
            <div className="mt-8 flex justify-center pb-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) goToPage(page - 1);
                      }}
                      className={
                        page <= 1 ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>

                  {[...Array(Math.ceil(total / pageSize))].map((_, i) => {
                    const targetPage = i + 1;
                    const totalPages = Math.ceil(total / pageSize);

                    if (
                      targetPage === 1 ||
                      targetPage === totalPages ||
                      (targetPage >= page - 1 && targetPage <= page + 1)
                    ) {
                      return (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={page === targetPage}
                            onClick={(e) => {
                              e.preventDefault();
                              goToPage(targetPage);
                            }}
                          >
                            {targetPage}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }

                    if (targetPage === page - 2 || targetPage === page + 2) {
                      return (
                        <PaginationItem key={i}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }

                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < Math.ceil(total / pageSize))
                          goToPage(page + 1);
                      }}
                      className={
                        page >= Math.ceil(total / pageSize)
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </section>
      )}

      <Dialog open={lightboxIndex !== null} onOpenChange={() => close()}>
        {/* The built-in close sits on a black backdrop here, so it is forced
            white rather than inheriting the popover foreground. */}
        <DialogContent className="w-[96vw] max-w-5xl gap-0 overflow-hidden border-0 bg-black/95 p-0 [&>button]:z-20 [&>button]:text-white">
          <div className="relative flex min-h-[70vh] items-center justify-center">
            {lightboxIndex !== null && images[lightboxIndex] && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full border-0 bg-white/10 text-white hover:bg-white/20"
                  onClick={goPrev}
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                <div className="relative h-[70vh] w-full">
                  <Image
                    src={images[lightboxIndex].url}
                    alt={`Photo ${lightboxIndex + 1} of ${images.length}`}
                    fill
                    sizes="96vw"
                    className="object-contain"
                    priority
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full border-0 bg-white/10 text-white hover:bg-white/20"
                  onClick={goNext}
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>

          <div className="bg-black/70 px-4 py-2.5 text-center text-sm tabular-nums text-white">
            {lightboxIndex !== null
              ? `${lightboxIndex + 1} / ${images.length}`
              : ""}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
