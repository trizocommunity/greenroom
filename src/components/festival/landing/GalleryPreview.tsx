"use client";

import { motion } from "framer-motion";
import { Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface GalleryImage {
  id: string;
  url: string;
  order: number;
}

interface GalleryPreviewProps {
  slug: string;
  images: GalleryImage[];
}

export function GalleryPreview({ slug, images }: GalleryPreviewProps) {
  const preview = images.slice(0, 4);

  if (preview.length === 0) return null;

  return (
    <section className="py-20 md:py-28 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="text-center md:text-left">
            <p className="text-eyebrow mb-3 md:justify-start justify-center">
              Moments
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-heading mb-2">
              Captured moments
            </h2>
            <p className="text-muted-foreground">
              Highlights from the festival.
            </p>
          </div>
          <Link href={`/${slug}/gallery`}>
            <Button
              variant="outline"
              className="gap-2 rounded-full font-medium border-border hover:bg-muted"
            >
              <ImageIcon className="w-4 h-4" /> View gallery
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:h-80">
          {preview.map((img, i) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              viewport={{ once: true }}
              className={`relative overflow-hidden rounded-2xl group cursor-zoom-in ${i === 0 ? "col-span-2 row-span-2 h-72 md:h-full" : "h-36 md:h-full"}`}
            >
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors z-10" />
              <Image
                src={img.url}
                alt={`Gallery image ${i + 1}`}
                fill
                className="object-cover transform group-hover:scale-105 transition-transform duration-500"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
