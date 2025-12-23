"use client";

import { motion } from "framer-motion";
import { useFestival } from "@/components/festival/FestivalContext";
import { MOCK_GALLERY } from "@/data/mockFestivalData";
import Image from "next/image";

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Festival Gallery
          </h1>
          <p className="text-muted-foreground">Reliving the best moments.</p>
        </div>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          {MOCK_GALLERY.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="break-inside-avoid rounded-xl overflow-hidden group relative"
            >
              <Image
                src={src}
                alt="Gallery item"
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
