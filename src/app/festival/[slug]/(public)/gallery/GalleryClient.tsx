"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ImageIcon, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface GalleryImage {
  id: string;
  url: string;
  caption: string | null;
}

interface GalleryClientProps {
  images: GalleryImage[];
  accentColor: string;
}

export function GalleryClient({ images, accentColor }: GalleryClientProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  if (images.length === 0) {
    return (
      <div className="py-16 text-center">
        <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground">
          No gallery images yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <button
            type="button"
            key={image.id}
            onClick={() => setSelectedImage(image)}
            className="group relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 transition-all"
            style={{ "--ring-color": accentColor } as React.CSSProperties}
          >
            <Image
              src={image.url}
              alt={image.caption || "Gallery image"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            {image.caption && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <p className="text-white text-sm">{image.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-8 w-8" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-5xl w-full aspect-video relative"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selectedImage.url}
                alt={selectedImage.caption || "Gallery image"}
                fill
                className="object-contain rounded-lg"
                priority
              />
              {selectedImage.caption && (
                <p className="absolute -bottom-12 left-0 right-0 text-white text-center">
                  {selectedImage.caption}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
