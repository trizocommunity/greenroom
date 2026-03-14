"use client";

import {
  Newspaper,
  Pencil,
  Plus,
  Trash2,
  Loader2,
  ImagePlus,
  Eye,
  MoreVertical,
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { uploadImageToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import {
  createNewsPostAction,
  updateNewsPostAction,
  deleteNewsPostAction,
} from "@/server/actions/news.actions";
import { format } from "date-fns";

type NewsPost = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  imageUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  festivalSlug,
  initialPosts,
}: NewsClientProps) {
  const [posts, setPosts] = useState<NewsPost[]>(initialPosts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewDetailsPost, setViewDetailsPost] = useState<NewsPost | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (post: NewsPost) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      excerpt: post.excerpt ?? "",
      content: post.content,
      imageUrl: post.imageUrl ?? "",
      published: !!post.publishedAt,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await updateNewsPostAction(festivalId, editingId, {
          title: form.title.trim(),
          excerpt: form.excerpt.trim() || null,
          content: form.content.trim(),
          imageUrl: form.imageUrl.trim() || null,
          publishedAt: form.published ? new Date() : null,
        });
        if (res.success) {
          toast.success("News updated.");
          setDialogOpen(false);
          window.location.reload();
        } else toast.error(res.error ?? "Failed to update.");
      } else {
        const res = await createNewsPostAction(festivalId, {
          title: form.title.trim(),
          excerpt: form.excerpt.trim() || null,
          content: form.content.trim(),
          imageUrl: form.imageUrl.trim() || null,
          publishedAt: form.published ? new Date() : null,
        });
        if (res.success) {
          toast.success("News post created.");
          setDialogOpen(false);
          window.location.reload();
        } else toast.error(res.error ?? "Failed to create.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteNewsPostAction(festivalId, id);
    if (res.success) {
      setDeleteConfirmId(null);
      setPosts((p) => p.filter((x) => x.id !== id));
      toast.success("News post deleted.");
      window.location.reload();
    } else toast.error(res.error ?? "Failed to delete.");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    if (!isCloudinaryConfigured()) {
      toast.error("Cloudinary is not configured.");
      return;
    }
    setUploadingImage(true);
    try {
      const url = await uploadImageToCloudinary(file, "news");
      if (url) setForm((f) => ({ ...f, imageUrl: url }));
      else toast.error("Upload failed.");
    } finally {
      setUploadingImage(false);
    }
  };

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
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 sm:mr-2" />
          Create news
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts.map((post) => (
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
                  <img
                    src={post.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
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
                  ? format(new Date(post.publishedAt), "MMM d, yyyy")
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
        onDelete={async () => { if (deleteConfirmId) await handleDelete(deleteConfirmId); }}
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
              Create a post to show on your public news page. Add a title, content, and optional image.
            </p>
            <Button variant="outline" className="mt-6" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create news
            </Button>
          </CardContent>
        </Card>
      )}

      {/* View details modal */}
      <Dialog open={!!viewDetailsPost} onOpenChange={(open) => !open && setViewDetailsPost(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewDetailsPost?.title}
            </DialogTitle>
            <DialogDescription>
              {viewDetailsPost?.publishedAt
                ? `Published ${format(new Date(viewDetailsPost.publishedAt), "MMM d, yyyy")}`
                : "Draft"}
            </DialogDescription>
          </DialogHeader>
          {viewDetailsPost && (
            <div className="space-y-4 py-2">
              {viewDetailsPost.imageUrl && (
                <img
                  src={viewDetailsPost.imageUrl}
                  alt=""
                  className="w-full rounded-lg aspect-video object-cover bg-muted"
                />
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
            <Button variant="outline" onClick={() => setViewDetailsPost(null)}>
              Close
            </Button>
            {viewDetailsPost && (
              <Button
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
                  disabled={uploadingImage || !isCloudinaryConfigured()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingImage ? (
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
              />
              <Label htmlFor="news-published">Publish now</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
