"use client";

import { format } from "date-fns";
import { Newspaper } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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

export function PublicNewsView({ posts, festivalSlug }: PublicNewsViewProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 py-24 text-center">
        <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No news posts yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {posts.map((post) => (
          <Card
            key={post.id}
            className="overflow-hidden border bg-card/80 backdrop-blur hover:shadow-lg transition-shadow"
          >
            {post.imageUrl && (
              <div className="aspect-video w-full bg-muted">
                <img
                  src={post.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader className="p-5 pb-1">
              <h2 className="text-lg font-semibold leading-tight line-clamp-2">
                {post.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {post.publishedAt
                  ? format(new Date(post.publishedAt), "MMMM d, yyyy")
                  : ""}
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {post.excerpt || post.content}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="lg:col-span-1">
        <p className="text-sm font-medium text-muted-foreground mb-3">
          All updates
        </p>
        <ScrollArea className="h-[420px] rounded-xl border bg-card/50 p-4">
          <ul className="space-y-3 pr-4">
            {posts.map((post) => (
              <li key={post.id}>
                <a
                  href={`#post-${post.id}`}
                  className={cn(
                    "block rounded-lg p-3 text-sm font-medium transition hover:bg-muted/50",
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
