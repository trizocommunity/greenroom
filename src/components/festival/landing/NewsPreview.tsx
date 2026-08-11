"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { NewsImage } from "@/components/festival/public/NewsImage";
import {
  PublicSection,
  SectionHeader,
} from "@/components/festival/public/PublicSection";
import { useFestivalLinkBase } from "@/components/providers/custom-domain-provider";

interface NewsPost {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  imageUrl: string | null;
  publishedAt: string | null;
}

interface NewsPreviewProps {
  slug: string;
  posts: NewsPost[];
  accentColor?: string;
}

/**
 * Three most recent posts as hairline-separated rows with a small square
 * thumbnail — roughly a third of the height the old card grid needed.
 */
export function NewsPreview({
  slug,
  posts,
  accentColor = "var(--primary)",
}: NewsPreviewProps) {
  const linkBase = useFestivalLinkBase(slug);
  const preview = posts.slice(0, 3);

  if (preview.length === 0) return null;

  return (
    <PublicSection bordered>
      <SectionHeader eyebrow="Updates" title="News" className="mb-8" />

      <ul className="divide-y divide-border border-y border-border">
        {preview.map((post, i) => (
          <motion.li
            key={post.id}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
          >
            <Link
              href={`${linkBase}/news`}
              className="group flex items-start gap-4 py-5"
            >
              <NewsImage
                src={post.imageUrl}
                title={post.title}
                accentColor={accentColor}
                sizes="64px"
                className="h-14 w-14 shrink-0 rounded-md sm:h-16 sm:w-16"
              />
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-1 text-[15px] font-semibold tracking-tight text-heading transition-opacity group-hover:opacity-70">
                  {post.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {post.excerpt || post.content}
                </p>
                {post.publishedAt && (
                  <p className="mt-1.5 text-xs text-muted-foreground/70">
                    {format(new Date(post.publishedAt), "MMMM d, yyyy")}
                  </p>
                )}
              </div>
            </Link>
          </motion.li>
        ))}
      </ul>

      <Link
        href={`${linkBase}/news`}
        className="group mt-5 inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
        style={{ color: accentColor }}
      >
        All news
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </PublicSection>
  );
}
