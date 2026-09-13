import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  DOWNLOAD_CATEGORY_LABELS,
  DOWNLOAD_FILE_TYPE_COLORS,
  DOWNLOAD_FILE_TYPE_LABELS,
  type DownloadCategory,
  type DownloadFileType,
} from "@/api/contracts/downloads";
import {
  PublicSection,
  SectionHeader,
} from "@/components/festival/public/PublicSection";
import { useFestivalLinkBase } from "@/components/providers/custom-domain-provider";

interface Download {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: DownloadFileType;
  category: DownloadCategory;
  publishedAt: string | null;
}

interface DownloadsPreviewProps {
  slug: string;
  downloads: Download[];
  accentColor?: string;
}

/**
 * Latest downloads as small badge cards. Renders nothing when there are
 * zero published downloads — empty sections on the landing page look broken.
 */
export function DownloadsPreview({
  slug,
  downloads,
  accentColor = "var(--primary)",
}: DownloadsPreviewProps) {
  const linkBase = useFestivalLinkBase(slug);
  const preview = downloads.slice(0, 6);

  if (preview.length === 0) return null;

  return (
    <PublicSection bordered>
      <SectionHeader title="Downloads" className="mb-8" />

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {preview.map((d) => (
          <li key={d.id}>
            <a
              href={d.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-sm hover:-translate-y-0.5"
            >
              <span
                aria-hidden
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg font-display text-sm font-semibold text-white"
                style={{
                  backgroundColor: DOWNLOAD_FILE_TYPE_COLORS[d.fileType],
                }}
              >
                {DOWNLOAD_FILE_TYPE_LABELS[d.fileType]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {DOWNLOAD_CATEGORY_LABELS[d.category]}
                </p>
                <p className="font-semibold text-sm leading-snug line-clamp-2 mt-0.5">
                  {d.title}
                </p>
                {d.publishedAt && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      aria-hidden
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                    {format(new Date(d.publishedAt), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            </a>
          </li>
        ))}
      </ul>

      <Link
        href={`${linkBase}/downloads`}
        className="group mt-5 inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
        style={{ color: accentColor }}
      >
        All downloads
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </PublicSection>
  );
}
