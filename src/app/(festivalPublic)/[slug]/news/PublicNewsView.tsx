"use client";

import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useCallback, useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { NewsImage } from "@/components/festival/public/NewsImage";
import { EmptyState } from "@/components/festival/public/PublicSection";
import { cn } from "@/core/utils/cn";
import { usePublicPages } from "@/features/festivals/hooks/use-public-pages";

type Post = {
  id: string;
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
  accentColor = "var(--primary)",
}: PublicNewsViewProps) {
  const [openId, setOpenId] = useState<string | null>(
    initialPosts[0]?.id ?? null,
  );

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

  const toggle = useCallback(
    (id: string) => setOpenId((current) => (current === id ? null : id)),
    [],
  );

  if (posts.length === 0) {
    return <EmptyState>No news posts yet.</EmptyState>;
  }

  return (
    <>
      <ol className="divide-y divide-border border-y border-border">
        {posts.map((post, i) => {
          const isOpen = openId === post.id;

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
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggle(post.id)}
                className="flex w-full items-start gap-4 py-5 text-left"
              >
                <NewsImage
                  src={post.imageUrl}
                  title={post.title}
                  accentColor={accentColor}
                  sizes="64px"
                  className="h-14 w-14 shrink-0 rounded-md sm:h-16 sm:w-16"
                />

                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-semibold leading-snug tracking-tight text-heading sm:text-base">
                    {post.title}
                  </h2>
                  {post.publishedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(post.publishedAt), "MMMM d, yyyy")}
                    </p>
                  )}
                  {!isOpen && (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {post.excerpt || post.content}
                    </p>
                  )}
                </div>

                <ChevronDown
                  className={cn(
                    "mt-1 h-4 w-4 shrink-0 transition-transform duration-300",
                    isOpen && "rotate-180",
                  )}
                  style={{
                    color: isOpen ? accentColor : "var(--muted-foreground)",
                  }}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pb-6 sm:pl-20">
                      <NewsImage
                        src={post.imageUrl}
                        title={post.title}
                        accentColor={accentColor}
                        sizes="(max-width: 768px) 100vw, 700px"
                        className="mb-5 aspect-[16/7] w-full rounded-lg"
                      />
                      <p className="max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                        {post.content}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ol>

      {Math.ceil(total / pageSize) > 1 && (
        <div className="mt-8 flex justify-center pb-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
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
                        href="#"
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
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < Math.ceil(total / pageSize)) goToPage(page + 1);
                  }}
                  className={page >= Math.ceil(total / pageSize) ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
}
