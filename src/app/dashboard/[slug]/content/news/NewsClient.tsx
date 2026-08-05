"use client";

import {
  Eye,
  ImagePlus,
  Loader2,
  MoreVertical,
  Newspaper,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { useCloudinaryUpload } from "@/api/client";
import {
  useCreateNews,
  useDeleteNews,
  useNews,
  useUpdateNews,
} from "@/api/client/news";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, parseInstant } from "@/core/datetime";
import { cn } from "@/core/utils/cn";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";

type NewsPost = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  imageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

interface NewsClientProps {
  festivalId: string;
  festivalSlug: string;
  initialPosts: NewsPost[];
}

const emptyForm = {
  title: "",
  excerpt: "",
  content: "",
  imageUrl: "",
  published: false,
};

export function NewsClient({
  festivalId,
  festivalSlug: _festivalSlug,
  initialPosts,
}: NewsClientProps) {
  const dirtySourceId = `news:${festivalId}`;
  const { registerDirtySource, unregisterDirtySource, setDirty } =
    useUnsavedChanges();
  const { isReadOnly } = useFestivalReadOnly();
  const displayTz = useDisplayTimezone();
  const [posts, setPosts] = useState<NewsPost[]>(initialPosts);
  const {
    data: newsData,
    isLoading,
    isError,
    error,
    refetch: refetchNews,
  } = useNews(festivalId);
  const createNews = useCreateNews();
  const updateNews = useUpdateNews();
  const deleteNews = useDeleteNews();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewDetailsPost, setViewDetailsPost] = useState<NewsPost | null>(null);
  const uploadMutation = useCloudinaryUpload();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState(
    JSON.stringify(emptyForm),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasUnsavedForm =
    dialogOpen && JSON.stringify(form) !== initialFormSnapshot;

  const openCreate = () => {
    if (isReadOnly) return;
    setEditingId(null);
    setForm(emptyForm);
    setInitialFormSnapshot(JSON.stringify(emptyForm));
    setDialogOpen(true);
  };

  const openEdit = (post: NewsPost) => {
    if (isReadOnly) return;
    setEditingId(post.id);
    setForm({
      title: post.title,
      excerpt: post.excerpt ?? "",
      content: post.content,
      imageUrl: post.imageUrl ?? "",
      published: !!post.publishedAt,
    });
    setInitialFormSnapshot(
      JSON.stringify({
        title: post.title,
        excerpt: post.excerpt ?? "",
        content: post.content,
        imageUrl: post.imageUrl ?? "",
        published: !!post.publishedAt,
      }),
    );
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateNews.mutateAsync({
          festivalId,
          postId: editingId,
          data: {
            title: form.title.trim(),
            excerpt: form.excerpt.trim() || null,
            content: form.content.trim(),
            imageUrl: form.imageUrl.trim() || null,
            publishedAt: form.published ? new Date().toISOString() : null,
          },
        });
        toast.success("News updated.");
        setDirty(dirtySourceId, false);
        setDialogOpen(false);
        refetchNews();
      } else {
        await createNews.mutateAsync({
          festivalId,
          data: {
            title: form.title.trim(),
            excerpt: form.excerpt.trim() || null,
            content: form.content.trim(),
            imageUrl: form.imageUrl.trim() || null,
            publishedAt: form.published ? new Date().toISOString() : null,
          },
        });
        toast.success("News post created.");
        setDirty(dirtySourceId, false);
        setDialogOpen(false);
        refetchNews();
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    registerDirtySource(dirtySourceId);
    return () => unregisterDirtySource(dirtySourceId);
  }, [dirtySourceId, registerDirtySource, unregisterDirtySource]);

  useEffect(() => {
    if (isReadOnly) {
      setDirty(dirtySourceId, false);
      return;
    }
    setDirty(dirtySourceId, hasUnsavedForm);
  }, [dirtySourceId, hasUnsavedForm, isReadOnly, setDirty]);

  const handleDelete = async (id: string) => {
    if (isReadOnly) return;
    try {
      await deleteNews.mutateAsync({ festivalId, postId: id });
      setDeleteConfirmId(null);
      setPosts((p) => p.filter((x) => x.id !== id));
      toast.success("News post deleted.");
      refetchNews();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    if (
      !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME === "demo"
    ) {
      toast.error("Cloudinary is not configured.");
      return;
    }
    try {
      const result = await uploadMutation.mutateAsync({ file, folder: "news" });
      if (result?.url) setForm((f) => ({ ...f, imageUrl: result.url }));
    } catch {
      // Error toast is handled by the hook
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              News
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Posts appear on your public news page.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              News
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Posts appear on your public news page.
            </p>
          </div>
        </div>
        <div className="text-center py-8 text-destructive">
          Error: {error.message}
        </div>
      </div>
    );
  }

  const displayPosts = newsData ?? posts;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">News</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Posts appear on your public news page.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HowItWorksButton
            title="How News works"
            description="News posts show on your festival's public news page."
          >
            <p className="text-sm text-muted-foreground">
              Create posts with a title, content, and optional image. They
              appear on your festival&apos;s public news page for visitors and
              participants.
            </p>
            <p className="text-sm text-muted-foreground">
              You can publish immediately or save as draft, and edit or delete
              posts anytime. Use the excerpt for a short summary on listing
              views.
            </p>
          </HowItWorksButton>
          <Button size="sm" onClick={openCreate} disabled={isReadOnly}>
            <Plus className="h-4 w-4 sm:mr-2" />
            Create news
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayPosts.map((post) => (
          <Card
            key={post.id}
            className={cn(
              "overflow-hidden transition-shadow hover:shadow-md",
              !post.imageUrl && "border-t-4 border-t-primary/20",
            )}
          >
            <div className="relative">
              {post.imageUrl ? (
                <div className="aspect-video w-full bg-muted">
                  <Image
                    src={post.imageUrl}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video w-full bg-muted/50 flex items-center justify-center">
                  <Newspaper className="h-10 w-10 text-muted-foreground/50" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full shadow-md bg-background/90 hover:bg-background"
                      aria-label="Actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setViewDetailsPost(post)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View details
                    </DropdownMenuItem>
                    {!isReadOnly && (
                      <>
                        <DropdownMenuItem onClick={() => openEdit(post)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteConfirmId(post.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-semibold line-clamp-2 leading-snug">
                {post.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {post.publishedAt
                  ? formatDate(parseInstant(post.publishedAt), {
                      tz: displayTz,
                      style: "medium",
                    })
                  : "Draft"}
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {post.excerpt || post.content}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <DeleteDialog
        title="Delete news post"
        description="This cannot be undone."
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onDelete={async () => {
          if (deleteConfirmId) await handleDelete(deleteConfirmId);
        }}
        isDeleting={false}
      />
      {posts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Newspaper className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No news posts yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Create a post to show on your public news page. Add a title,
              content, and optional image.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-6"
              onClick={openCreate}
              disabled={isReadOnly}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create news
            </Button>
          </CardContent>
        </Card>
      )}

      {/* View details modal */}
      <Dialog
        open={!!viewDetailsPost}
        onOpenChange={(open) => !open && setViewDetailsPost(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewDetailsPost?.title}</DialogTitle>
            <DialogDescription>
              {viewDetailsPost?.publishedAt
                ? `Published ${formatDate(parseInstant(viewDetailsPost.publishedAt), { tz: displayTz, style: "medium" })}`
                : "Draft"}
            </DialogDescription>
          </DialogHeader>
          {viewDetailsPost && (
            <div className="space-y-4 py-2">
              {viewDetailsPost.imageUrl && (
                <div className="relative w-full aspect-video">
                  <Image
                    src={viewDetailsPost.imageUrl}
                    alt={viewDetailsPost.title}
                    fill
                    className="rounded-lg object-cover bg-muted"
                  />
                </div>
              )}
              {viewDetailsPost.excerpt && (
                <p className="text-sm text-muted-foreground font-medium">
                  {viewDetailsPost.excerpt}
                </p>
              )}
              <div className="text-sm whitespace-pre-wrap">
                {viewDetailsPost.content}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewDetailsPost(null)}
            >
              Close
            </Button>
            {viewDetailsPost && !isReadOnly && (
              <Button
                size="sm"
                onClick={() => {
                  setViewDetailsPost(null);
                  openEdit(viewDetailsPost);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit news post" : "Create news post"}
            </DialogTitle>
            <DialogDescription>
              Title and content are shown on your public news page. Add an
              excerpt for meta and social sharing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="news-title">Title</Label>
              <Input
                id="news-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Headline"
                disabled={isReadOnly}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="news-excerpt">Excerpt (for meta / social)</Label>
              <Input
                id="news-excerpt"
                value={form.excerpt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, excerpt: e.target.value }))
                }
                placeholder="Short summary"
                disabled={isReadOnly}
              />
            </div>
            <div className="grid gap-2">
              <Label>Featured image</Label>
              <div className="flex gap-2">
                <Input
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, imageUrl: e.target.value }))
                  }
                  placeholder="Image URL"
                  disabled={isReadOnly}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={
                    isReadOnly ||
                    uploadMutation.isPending ||
                    !(
                      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
                      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME !== "demo"
                    )
                  }
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="news-content">Content</Label>
              <Textarea
                id="news-content"
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                placeholder="Full story..."
                rows={6}
                className="resize-none"
                disabled={isReadOnly}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="news-published"
                checked={form.published}
                onChange={(e) =>
                  setForm((f) => ({ ...f, published: e.target.checked }))
                }
                className="rounded border"
                disabled={isReadOnly}
              />
              <Label htmlFor="news-published">Publish now</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={
                saving || isReadOnly || !hasUnsavedForm || !form.title.trim()
              }
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
