"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  PUBLIC_CONTAINER,
  SectionHeader,
} from "@/components/festival/public/PublicSection";

interface MediaImage {
  id: string;
  url: string;
  order: number;
}

interface MediaPreviewProps {
  slug: string;
  images: MediaImage[];
  accentColor?: string;
}

/**
 * A single horizontal filmstrip that runs past the container edge, so the
 * photos read as a continuation of the festival rather than a gallery widget.
 */
export function MediaPreview({
  slug,
  images,
  accentColor = "var(--primary)",
}: MediaPreviewProps) {
  const preview = images.slice(0, 8);

  if (preview.length === 0) return null;

  return (
    <section className="border-t border-border py-14 md:py-20">
      <div className={PUBLIC_CONTAINER}>
        <SectionHeader
          eyebrow="Moments"
          title="From the festival"
          className="mb-8"
        />
      </div>

      <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-1 sm:px-6">
        {preview.map((img, i) => (
          <motion.div
            key={img.id}
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.05 }}
            className="relative aspect-[4/5] w-40 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-52"
          >
            <Image
              src={img.url}
              alt=""
              fill
              sizes="(max-width: 640px) 160px, 208px"
              className="object-cover transition-transform duration-700 hover:scale-105"
            />
          </motion.div>
        ))}
      </div>

      <div className={`mt-6 ${PUBLIC_CONTAINER}`}>
        <Link
          href={`/${slug}/media`}
          className="group inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: accentColor }}
        >
          All media
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
