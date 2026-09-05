"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import Link from "next/link";
import { NewsImage } from "@/components/festival/public/NewsImage";
import { EmptyState } from "@/components/festival/public/PublicSection";
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

type Post = {
  id: string;
  slug: string | null;
  title: string;
  excerpt: string | null;
  content: string;
  imageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
};

interface PublicNewsViewProps {
  /** Server-rendered first page. */
  posts: Post[];
  total: number;
  hasMore: boolean;
  pageSize: number;
  festivalSlug: string;
  linkBase?: string;
  accentColor?: string;
}

const selectPosts = (data: unknown) => (data as { posts: Post[] }).posts;

/**
 * News as an expandable list. The old grid truncated every post to four
 * lines with no way to read the rest; here the full post opens in place,
 * which is both more compact when closed and actually complete when open.
 */
export function PublicNewsView({
  posts: initialPosts,
  total: initialTotal,
  hasMore: initialHasMore,
  pageSize,
  festivalSlug,
  linkBase,
  accentColor = "var(--primary)",
}: PublicNewsViewProps) {
  const {
    items: posts,
    total,
    hasMore,
    isLoadingMore,
    error,
    loadMore,
    page,
    goToPage,
  } = usePublicPages<Post>({
    endpoint: `/api/festivals/${festivalSlug}/news`,
    select: selectPosts,
    pageSize,
    initial: {
      items: initialPosts,
      total: initialTotal,
      page: 1,
      hasMore: initialHasMore,
    },
  });

  if (posts.length === 0) {
    return <EmptyState>No news posts yet.</EmptyState>;
  }

  return (
    <>
      <ul className="flex flex-col gap-6 sm:gap-4 sm:divide-y sm:divide-border sm:border-y sm:border-border">
        {posts.map((post, i) => {
          const detailUrl = `${linkBase ?? `/${festivalSlug}`}/news/${post.slug || post.id}`;

          return (
            <motion.li
              key={post.id}
              id={`post-${post.id}`}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.35,
                delay: Math.min(i % pageSize, 8) * 0.04,
              }}
              className="sm:py-4"
            >
              <Link
                href={detailUrl}
                className="group flex flex-col sm:flex-row w-full items-start gap-4 text-left transition-colors sm:hover:bg-muted/30 sm:rounded-lg sm:p-2 bg-card sm:bg-transparent rounded-xl border sm:border-none shadow-sm sm:shadow-none overflow-hidden"
              >
                <div className="w-full sm:w-auto overflow-hidden">
                  <NewsImage
                    src={post.imageUrl}
                    title={post.title}
                    accentColor={accentColor}
                    sizes="(max-width: 640px) 100vw, 150px"
                    className="h-48 w-full sm:h-24 sm:w-32 shrink-0 object-cover sm:rounded-md transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="min-w-0 flex-1 w-full p-4 sm:p-0">
                  <h2 className="text-[17px] font-semibold leading-snug tracking-tight text-heading sm:text-base group-hover:underline decoration-muted-foreground/30 underline-offset-2">
                    {post.title}
                  </h2>
                  {post.publishedAt && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {format(new Date(post.publishedAt), "MMMM d, yyyy")}
                    </p>
                  )}
                  <p className="mt-2.5 sm:mt-1.5 line-clamp-3 sm:line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {post.excerpt || post.content.replace(/<[^>]+>/g, "")}
                  </p>
                </div>
              </Link>
            </motion.li>
          );
        })}
      </ul>

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
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
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
                    if (page < Math.ceil(total / pageSize)) goToPage(page + 1);
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
    </>
  );
}
