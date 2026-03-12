"use client";

import { Copy, ExternalLink, ImagePlus, Newspaper, Radio, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { setPublicSiteEnabledAction } from "@/server/actions/festival.actions";
import {
  addGalleryImageAction,
  addNewsPostAction,
  removeGalleryImageAction,
  removeNewsPostAction,
} from "@/server/actions/festival-live.actions";

interface GalleryImage {
  id: string;
  url: string;
  order: number;
}

interface NewsPost {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
}

interface FestivalLiveClientProps {
  festivalId: string;
  festivalSlug: string;
  publicSiteEnabled: boolean;
  canEnable: boolean;
  validationErrors: string[];
  publicUrl: string;
  isBasicTier: boolean;
  galleryImages: GalleryImage[];
  newsPosts: NewsPost[];
}

export function FestivalLiveClient({
  festivalId,
  festivalSlug,
  publicSiteEnabled,
  canEnable,
  validationErrors,
  publicUrl,
  isBasicTier,
  galleryImages: initialGallery,
  newsPosts: initialNews,
}: FestivalLiveClientProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(publicSiteEnabled);
  const [loading, setLoading] = useState(false);
  const [galleryUrl, setGalleryUrl] = useState("");
  const [newsTitle, setNewsTitle] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [newsImageUrl, setNewsImageUrl] = useState("");

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const result = await setPublicSiteEnabledAction(festivalId, checked);
      if (result?.success) {
        setEnabled(checked);
        toast.success(checked ? "Public website is now live." : "Public website is now disabled.");
      } else {
        const message =
          result && "error" in result && typeof result.error === "string"
            ? result.error
            : "Failed to update.";
        toast.error(message);
      }
    } catch {
      toast.error("Failed to update.");
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied to clipboard.");
  };

  const fullPublicUrl = publicUrl || (typeof window !== "undefined" ? `${window.location.origin}/${festivalSlug}` : `/${festivalSlug}`);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* When Live: copiable link section at top — unique shareable UI */}
        {enabled && fullPublicUrl && (
          <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-primary/5 via-background to-background">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-primary">
                <Radio className="h-5 w-5" />
                <CardTitle className="text-lg">Your festival is live</CardTitle>
              </div>
              <CardDescription>
                Share this link with your audience. Anyone with the link can view your public festival site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2.5 font-mono text-sm break-all">
                  <span className="text-muted-foreground shrink-0">URL</span>
                  <span className="min-w-0 truncate" title={fullPublicUrl}>
                    {fullPublicUrl}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  onClick={copyUrl}
                >
                  <Copy className="h-4 w-4" />
                  Copy link
                </Button>
              </div>
              <Button asChild variant="secondary" size="sm" className="gap-2">
                <a href={fullPublicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  View public site
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Enable / Disable control */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Public website</CardTitle>
            <CardDescription>
              {enabled
                ? "Your public festival site is visible at the link above. Turn off to make the URL return a 404 page."
                : "When disabled, the public URL is not accessible. Complete the required content below to enable."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="public-site-toggle" className="text-sm font-medium">
                Enable public festival website
              </Label>
              {canEnable ? (
                <Switch
                  id="public-site-toggle"
                  checked={enabled}
                  onCheckedChange={handleToggle}
                  disabled={loading}
                />
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Switch
                        id="public-site-toggle"
                        checked={enabled}
                        onCheckedChange={(checked) => {
                          if (checked) return;
                          handleToggle(false);
                        }}
                        disabled={loading || (!enabled && !canEnable)}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    Complete all required content below before enabling.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {!canEnable && validationErrors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  Required before enabling
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-1">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Non-BASIC: Gallery and News content */}
        {!isBasicTier && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ImagePlus className="h-4 w-4" />
                  Gallery
                </CardTitle>
                <CardDescription>
                  At least 4 images required for the public site. Add image URLs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Image URL"
                    value={galleryUrl}
                    onChange={(e) => setGalleryUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!galleryUrl.trim()) return;
                      const r = await addGalleryImageAction(festivalId, galleryUrl);
                      if (r?.success) {
                        setGalleryUrl("");
                        toast.success("Image added.");
                        router.refresh();
                      } else toast.error((r as { error: string })?.error ?? "Failed");
                    }}
                  >
                    Add
                  </Button>
                </div>
                <ul className="space-y-2">
                  {initialGallery.map((img) => (
                    <li
                      key={img.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                    >
                      <span className="truncate text-muted-foreground">{img.url}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={async () => {
                          const r = await removeGalleryImageAction(img.id);
                          if (r?.success) {
                            toast.success("Removed.");
                            router.refresh();
                          } else toast.error("Failed");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  {initialGallery.length} / 4 images (min 4 required)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Newspaper className="h-4 w-4" />
                  News & Updates
                </CardTitle>
                <CardDescription>
                  At least 3 posts required; each must have title, description, and image.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>New post</Label>
                  <Input
                    placeholder="Title"
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Content / description"
                    value={newsContent}
                    onChange={(e) => setNewsContent(e.target.value)}
                    rows={2}
                  />
                  <Input
                    placeholder="Image URL"
                    value={newsImageUrl}
                    onChange={(e) => setNewsImageUrl(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!newsTitle.trim() || !newsContent.trim()) {
                        toast.error("Title and content required.");
                        return;
                      }
                      const r = await addNewsPostAction(festivalId, {
                        title: newsTitle,
                        content: newsContent,
                        imageUrl: newsImageUrl.trim() || null,
                      });
                      if (r?.success) {
                        setNewsTitle("");
                        setNewsContent("");
                        setNewsImageUrl("");
                        toast.success("Post added.");
                        router.refresh();
                      } else toast.error("Failed");
                    }}
                  >
                    Add post
                  </Button>
                </div>
                <ul className="space-y-2">
                  {initialNews.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.content.length > 60 ? `${p.content.slice(0, 60)}…` : p.content}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={async () => {
                          const r = await removeNewsPostAction(p.id);
                          if (r?.success) {
                            toast.success("Removed.");
                            router.refresh();
                          } else toast.error("Failed");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  {initialNews.length} / 3 posts (min 3 required; each needs title, content, image)
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
