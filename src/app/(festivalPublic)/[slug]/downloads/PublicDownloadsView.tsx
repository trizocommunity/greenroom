"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  DOWNLOAD_CATEGORY_LABELS,
  DOWNLOAD_FILE_TYPE_COLORS,
  DOWNLOAD_FILE_TYPE_LABELS,
} from "@/api/contracts/downloads";
import {
  EmptyState,
  PublicSection,
  SectionHeader,
} from "@/components/festival/public/PublicSection";

type Download = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: keyof typeof DOWNLOAD_FILE_TYPE_LABELS;
  category: keyof typeof DOWNLOAD_CATEGORY_LABELS;
  publishedAt: string | null;
  createdAt: string;
};

type Group = {
  category: keyof typeof DOWNLOAD_CATEGORY_LABELS;
  downloads: Download[];
};

interface PublicDownloadsViewProps {
  groups: Group[];
  total: number;
  festivalSlug: string;
  accentColor?: string;
}

/**
 * Downloadable files grouped by category. Each card carries a coloured
 * file-type badge and a date stamp; clicking the card opens the external
 * URL in a new tab.
 */
export function PublicDownloadsView({
  groups,
  total: _total,
  festivalSlug: _festivalSlug,
  accentColor = "var(--primary)",
}: PublicDownloadsViewProps) {
  if (groups.length === 0) {
    return (
      <PublicSection>
        <EmptyState>No downloads available yet.</EmptyState>
      </PublicSection>
    );
  }

  return (
    <>
      {groups.map((group, gIdx) => (
        <PublicSection
          key={group.category}
          bordered={gIdx > 0}
          className={gIdx === 0 ? "pt-2 md:pt-4" : undefined}
        >
          <SectionHeader
            title={DOWNLOAD_CATEGORY_LABELS[group.category]}
            subtitle={
              group.downloads.length === 1
                ? "1 file"
                : `${group.downloads.length} files`
            }
            className="mb-8"
          />

          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {group.downloads.map((download, i) => (
              <motion.li
                key={download.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.35,
                  delay: Math.min(i, 6) * 0.04,
                }}
              >
                <a
                  href={download.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div
                    aria-hidden
                    className="aspect-[4/3] flex items-center justify-center"
                    style={{
                      backgroundColor: `${DOWNLOAD_FILE_TYPE_COLORS[download.fileType]}1F`,
                    }}
                  >
                    <span
                      className="inline-flex h-20 w-20 items-center justify-center rounded-2xl font-display text-2xl font-semibold text-white"
                      style={{
                        backgroundColor:
                          DOWNLOAD_FILE_TYPE_COLORS[download.fileType],
                      }}
                    >
                      {DOWNLOAD_FILE_TYPE_LABELS[download.fileType]}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-[17px] font-semibold leading-snug tracking-tight text-heading line-clamp-2">
                      {download.title}
                    </h3>
                    {download.description && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                        {download.description}
                      </p>
                    )}
                    {download.publishedAt && (
                      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          aria-hidden
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: accentColor }}
                        />
                        {format(new Date(download.publishedAt), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </a>
              </motion.li>
            ))}
          </ul>
        </PublicSection>
      ))}
    </>
  );
}
