"use client";

import { format } from "date-fns";
import { Newspaper } from "lucide-react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/core/utils/cn";

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
  posts: Post[];
  festivalSlug: string;
}

export function PublicNewsView({
  posts,
  festivalSlug: _festivalSlug,
}: PublicNewsViewProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-24 text-center">
        <Newspaper
          className="h-10 w-10 text-muted-foreground mx-auto mb-3"
          strokeWidth={1.5}
        />
        <p className="text-muted-foreground">No news posts yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {posts.map((post) => (
          <article
            key={post.id}
            id={`post-${post.id}`}
            className="overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-premium"
          >
            {post.imageUrl && (
              <div className="relative aspect-video w-full bg-muted">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-5 space-y-2">
              <h2 className="text-lg font-semibold tracking-tight leading-tight line-clamp-2 text-heading">
                {post.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {post.publishedAt
                  ? format(new Date(post.publishedAt), "MMMM d, yyyy")
                  : ""}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {post.excerpt || post.content}
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className="lg:col-span-1">
        <p className="text-sm font-medium text-foreground mb-3">All updates</p>
        <ScrollArea className="h-[420px] rounded-2xl border border-border bg-card p-4">
          <ul className="space-y-2 pr-4">
            {posts.map((post) => (
              <li key={post.id}>
                <a
                  href={`#post-${post.id}`}
                  className={cn(
                    "block rounded-xl p-3 text-sm font-medium text-foreground transition-colors hover:bg-muted",
                  )}
                >
                  <span className="line-clamp-2">{post.title}</span>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {post.publishedAt
                      ? format(new Date(post.publishedAt), "MMM d, yyyy")
                      : ""}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </div>
    </div>
  );
}
