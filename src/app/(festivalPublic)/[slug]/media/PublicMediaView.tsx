"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/core/utils/cn";

type ImageItem = { id: string; url: string; order: number };

interface PublicMediaViewProps {
  images: ImageItem[];
}

export function PublicMediaView({ images }: PublicMediaViewProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const open = (i: number) => setLightboxIndex(i);
  const close = () => setLightboxIndex(null);
  const goPrev = () =>
    setLightboxIndex((i) =>
      i === null ? null : i <= 0 ? images.length - 1 : i - 1,
    );
  const goNext = () =>
    setLightboxIndex((i) =>
      i === null ? null : i >= images.length - 1 ? 0 : i + 1,
    );

  if (images.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-24 text-center">
        <p className="text-muted-foreground">No photos in the media yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {images.map((img, index) => (
          <button
            key={img.id}
            type="button"
            className={cn(
              "group relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border focus:outline-none focus:ring-2 ring-primary ring-offset-2 transition-all hover:border-primary/30 hover:shadow-premium",
              index % 5 === 0 && "sm:col-span-2 sm:row-span-2",
            )}
            onClick={() => open(index)}
          >
            <Image
              src={img.url}
              alt="Media image"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <Dialog open={lightboxIndex !== null} onOpenChange={() => close()}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 gap-0 overflow-hidden bg-black/98 border-0">
          <div className="relative flex items-center justify-center min-h-[70vh]">
            {lightboxIndex !== null && images[lightboxIndex] && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white border-0"
                  onClick={goPrev}
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <div className="relative w-full h-[70vh]">
                  <Image
                    src={images[lightboxIndex].url}
                    alt="Lightbox view"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white border-0"
                  onClick={goNext}
                  aria-label="Next"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
          </div>
          <div className="flex justify-between items-center px-4 py-3 bg-black/60 text-white text-sm">
            <span>
              {lightboxIndex !== null && images[lightboxIndex]
                ? `${lightboxIndex + 1} / ${images.length}`
                : ""}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={close}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
