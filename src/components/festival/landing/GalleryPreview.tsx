"use client";

import { motion } from "framer-motion";
import { Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MOCK_GALLERY } from "@/data/mockFestivalData";

interface GalleryPreviewProps {
  slug: string;
}

export function GalleryPreview({ slug }: GalleryPreviewProps) {
  // Use first 4 images
  const images = MOCK_GALLERY.slice(0, 4);

  return (
    <section className="py-24 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              Captured Moments
            </h2>
            <p className="text-muted-foreground">
              Highlights from the festival.
            </p>
          </div>
          <Link href={`/festival/${slug}/gallery`}>
            <Button variant="outline" className="gap-2 rounded-full">
              <ImageIcon className="w-4 h-4" /> View Gallery
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:h-80">
          {images.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`relative overflow-hidden rounded-2xl group cursor-zoom-in ${i === 0 ? "col-span-2 row-span-2 h-80 md:h-full" : "h-40 md:h-full"}`}
            >
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors z-10" />
              <img
                src={img}
                alt={`Gallery ${i}`}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
