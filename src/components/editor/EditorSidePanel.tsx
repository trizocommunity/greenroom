"use client";

import {
  ChevronDown,
  ChevronLeft,
  Circle,
  Copy,
  ExternalLink,
  Eye,
  ImageIcon,
  ImageOff,
  Minus,
  RefreshCw,
  Square,
  Trash2,
  Triangle,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/core/utils/cn";
import {
  addMediaImageAction,
  deleteMediaImageAction,
} from "@/features/media/actions/media.actions";
import { toast } from "@/lib/toast";
import { EditorCanvasSizeSetup } from "./EditorCanvasSizeSetup";
import { EditorFontsPanel } from "./EditorFontsPanel";
import { editorPanelAside } from "./editor-chrome";
import type { EditorNavPanel } from "./poster-editor-config";
import { BACKGROUND_SWATCHES } from "./poster-editor-config";
import type { PosterEditorState } from "./use-poster-editor-state";

const VISIBLE_MEDIA_ROWS = 2;
const VISIBLE_MEDIA_COLUMNS = 3;
const VISIBLE_MEDIA_LIMIT = VISIBLE_MEDIA_ROWS * VISIBLE_MEDIA_COLUMNS;

export function EditorPanelHeader({
  title,
  onCollapse,
}: {
  title: string;
  onCollapse?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b px-3 py-2">
      <h2 className="min-w-0 flex-1 text-[11px] font-bold uppercase tracking-wide text-foreground">
        {title}
      </h2>
      {onCollapse && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground"
          title="Collapse panel"
          onClick={onCollapse}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function PanelTitle({
  panel,
  onCollapse,
}: {
  panel: EditorNavPanel;
  onCollapse?: () => void;
}) {
  const labels: Record<EditorNavPanel, string> = {
    templates: "Templates",
    elements: "Elements",
    bg: "Background",
    layers: "Canvas layers",
    fonts: "Fonts",
  };
  return <EditorPanelHeader title={labels[panel]} onCollapse={onCollapse} />;
}

function FieldTile({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-center text-xs font-medium shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/10"
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="leading-tight">{label}</span>
    </button>
  );
}

function ShapeTile({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-xs font-medium shadow-sm hover:bg-muted/60"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

export function EditorSidePanel({
  editor,
  variant = "docked",
  onCollapsePanel,
  festivalId,
  onMediaChanged,
}: {
  editor: PosterEditorState;
  variant?: "docked" | "drawer" | "floating";
  onCollapsePanel?: () => void;
  festivalId?: string;
  onMediaChanged?: () => void | Promise<void>;
}) {
  const bgInputRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<{
    id: string;
    url: string;
  } | null>(null);
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [brokenImageUrls, setBrokenImageUrls] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [uploadingBg, setUploadingBg] = useState(false);
  const [showAllMedia, setShowAllMedia] = useState(false);

  const {
    navPanel,
    doc,
    fieldsForTemplate,
    fieldsSectionTitle,
    fieldsSectionHint,
    addFestField,
    addTextBlock,
    addShape,
    addImageFromFile,
    updateBackground,
    sortedElements,
    selectedId,
    setSelectedId,
    moveLayer,
    removeElement,
  } = editor;

  const festivalImages = editor.festivalImages ?? [];
  const hasMoreMedia = festivalImages.length > VISIBLE_MEDIA_LIMIT;
  const visibleMediaImages = showAllMedia
    ? festivalImages
    : festivalImages.slice(0, VISIBLE_MEDIA_LIMIT);
  const [retryCounters, setRetryCounters] = useState<Map<string, number>>(
    () => new Map(),
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const removeFromLibrary = async (img: { id: string; url: string }) => {
    if (!festivalId) {
      toast.error("Cannot remove — missing festival context");
      return;
    }
    setDeletingId(img.id);
    try {
      const result = await deleteMediaImageAction(festivalId, img.id);
      if (result.success) {
        toast.success("Removed from media library");
        await onMediaChanged?.();
      } else {
        toast.error(result.error ?? "Failed to remove from library");
      }
    } catch {
      toast.error("Failed to remove from library");
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  };

  const markImageBroken = (id: string, url: string) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[EditorSidePanel] Failed to load media thumbnail: ${url}`,
      );
    }
    setBrokenImageIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setBrokenImageUrls((prev) => {
      if (prev.has(id)) return prev;
      const next = new Map(prev);
      next.set(id, url);
      return next;
    });
  };

  const retryImage = (id: string) => {
    setBrokenImageIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setBrokenImageUrls((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setRetryCounters((prev) => {
      const next = new Map(prev);
      next.set(id, (prev.get(id) ?? 0) + 1);
      return next;
    });
  };

  const clearBroken = (id: string) => {
    setBrokenImageIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setBrokenImageUrls((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("URL copied to clipboard");
    } catch {
      toast.error("Could not copy URL");
    }
  };

  const applyImageAsBackground = (url: string) => {
    if (!doc) return;
    updateBackground({
      type: "image",
      color: doc.background.color,
      imageUrl: url,
    });
    const image = new window.Image();
    image.onload = () => {
      if (image.naturalWidth && image.naturalHeight) {
        editor.resizeCanvas(image.naturalWidth, image.naturalHeight);
      }
    };
    image.src = url;
  };

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col bg-card",
        variant === "docked" && editorPanelAside,
        variant === "drawer" && "h-full w-full",
      )}
    >
      {variant === "docked" && (
        <PanelTitle panel={navPanel} onCollapse={onCollapsePanel} />
      )}
      {navPanel === "fonts" ? (
        <div className="flex min-h-0 flex-1 flex-col p-3">
          <EditorFontsPanel editor={editor} />
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 p-3">
            {navPanel === "elements" && (
              <>
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {fieldsSectionTitle}
                  </p>
                  {fieldsSectionHint && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      {fieldsSectionHint}
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {fieldsForTemplate.map((f) => (
                      <FieldTile
                        key={f.key}
                        icon={f.icon}
                        label={f.label}
                        onClick={() => {
                          if (!doc) {
                            toast.message("Create a template first");
                            return;
                          }
                          addFestField(f.key);
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Text
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <ShapeTile
                      label="Heading"
                      onClick={() => doc && addTextBlock("heading")}
                    >
                      <span className="text-lg font-bold">H</span>
                    </ShapeTile>
                    <ShapeTile
                      label="Body"
                      onClick={() => doc && addTextBlock("body")}
                    >
                      <span className="text-base">T</span>
                    </ShapeTile>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Images & shapes
                  </p>
                  <input
                    ref={assetInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && doc) addImageFromFile(f);
                      e.target.value = "";
                    }}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <ShapeTile
                      label="Upload"
                      onClick={() => {
                        if (!doc)
                          return toast.message("Create a template first");
                        assetInputRef.current?.click();
                      }}
                    >
                      <Upload className="h-5 w-5" />
                    </ShapeTile>
                    <ShapeTile
                      label="Rectangle"
                      onClick={() => doc && addShape("rect")}
                    >
                      <Square className="h-5 w-5" />
                    </ShapeTile>
                    <ShapeTile
                      label="Circle"
                      onClick={() => doc && addShape("circle")}
                    >
                      <Circle className="h-5 w-5" />
                    </ShapeTile>
                    <ShapeTile
                      label="Triangle"
                      onClick={() => doc && addShape("triangle")}
                    >
                      <Triangle className="h-5 w-5" />
                    </ShapeTile>
                    <ShapeTile
                      label="Line"
                      onClick={() => doc && addShape("line")}
                    >
                      <Minus className="h-5 w-5" />
                    </ShapeTile>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    PNG, JPG, WebP, or SVG. Uploaded to cloud automatically.
                  </p>
                </div>
              </>
            )}

            {navPanel === "bg" && doc && (
              <>
                <EditorCanvasSizeSetup editor={editor} />
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (!editor.uploadImage) {
                      toast.error(
                        "Upload is not available in this editor session",
                      );
                      e.target.value = "";
                      return;
                    }
                    if (!festivalId) {
                      toast.error(
                        "Cannot save to media library — festival context missing",
                      );
                      e.target.value = "";
                      return;
                    }
                    setUploadingBg(true);
                    try {
                      const uploadedUrl = await editor.uploadImage(f);
                      applyImageAsBackground(uploadedUrl);
                      const result = await addMediaImageAction(
                        festivalId,
                        uploadedUrl,
                      );
                      if (result.success) {
                        toast.success("Background set and saved to media library");
                        await onMediaChanged?.();
                      } else {
                        toast.error(
                          `Saved to storage but not to library: ${result.error ?? "unknown error"}`,
                        );
                      }
                    } catch (err) {
                      const message =
                        err instanceof Error ? err.message : undefined;
                      toast.error(
                        message
                          ? `Upload failed: ${message}`
                          : "Failed to upload background image",
                      );
                    } finally {
                      setUploadingBg(false);
                      e.target.value = "";
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={uploadingBg}
                  onClick={() => bgInputRef.current?.click()}
                  className="mb-4 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ImageIcon className="h-8 w-8 opacity-50" />
                  {uploadingBg ? "Uploading…" : "Add background"}
                  <span className="text-xs">PNG, JPG, WebP, SVG</span>
                </button>

                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold">Uploaded Media</p>
                    <div className="flex items-center gap-2">
                      {festivalImages.length > 0 && (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {festivalImages.length} image
                          {festivalImages.length === 1 ? "" : "s"}
                        </span>
                      )}
                      <button
                        type="button"
                        title="Refresh from server"
                        onClick={() => void onMediaChanged?.()}
                        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Refresh media library"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {festivalImages.length > 0 ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {visibleMediaImages.map((img) => {
                          const broken = brokenImageIds.has(img.id);
                          const isActive =
                            doc.background.type === "image" &&
                            doc.background.imageUrl === img.url;
                          const failedUrl =
                            brokenImageUrls.get(img.id) ?? img.url;
                          const retryCount = retryCounters.get(img.id) ?? 0;
                          return (
                            <div
                              key={img.id}
                              className={cn(
                                "group relative aspect-square w-full overflow-hidden rounded-lg border-2 bg-muted shadow-sm",
                                isActive
                                  ? "border-primary ring-2 ring-primary/40"
                                  : "border-border hover:border-primary/60",
                              )}
                            >
                              {broken ? (
                                <div
                                  title={failedUrl || "(empty URL)"}
                                  className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-muted px-1 text-center text-muted-foreground"
                                >
                                  <ImageOff className="h-5 w-5" />
                                  <span className="text-[10px] font-medium">
                                    Failed
                                  </span>
                                  <span className="max-w-full truncate text-[9px] opacity-70">
                                    {failedUrl || "(empty URL)"}
                                  </span>
                                </div>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={`${img.id}-${retryCount}`}
                                  src={img.url}
                                  alt=""
                                  onError={() =>
                                    markImageBroken(img.id, img.url)
                                  }
                                  onLoad={() => clearBroken(img.id)}
                                  className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                                />
                              )}
                              <button
                                type="button"
                                title={
                                  broken ? `Failed: ${failedUrl}` : "Preview image"
                                }
                                onClick={() => setPreviewImage(img)}
                                className="absolute inset-0 z-10 bg-transparent"
                                aria-label="Preview image"
                              />
                              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100">
                                <Eye className="h-5 w-5 text-white drop-shadow" />
                              </div>
                              {broken && (
                                <div className="absolute right-1 top-1 z-30 flex items-center gap-0.5 rounded-full bg-background/95 p-0.5 shadow">
                                  {pendingDeleteId === img.id ? (
                                    <button
                                      type="button"
                                      title="Confirm remove from library"
                                      disabled={deletingId === img.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void removeFromLibrary(img);
                                      }}
                                      className="flex h-5 items-center gap-0.5 rounded-full bg-destructive px-1.5 text-[10px] font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      {deletingId === img.id ? "…" : "Remove"}
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        title="Open URL in new tab"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(
                                            failedUrl,
                                            "_blank",
                                            "noopener",
                                          );
                                        }}
                                        className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                                        aria-label="Open URL in new tab"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        title="Copy URL"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void copyToClipboard(failedUrl);
                                        }}
                                        className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                                        aria-label="Copy URL"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        title="Retry loading image"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          retryImage(img.id);
                                        }}
                                        className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                                        aria-label="Retry loading image"
                                      >
                                        <RefreshCw className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        title="Remove from media library"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPendingDeleteId(img.id);
                                        }}
                                        className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                                        aria-label="Remove from media library"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {hasMoreMedia && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllMedia((v) => !v)}
                          className="mt-2 w-full justify-center text-xs text-muted-foreground"
                        >
                          {showAllMedia
                            ? "Show less"
                            : `View all (${festivalImages.length})`}
                          <ChevronDown
                            className={cn(
                                "ml-1 h-3.5 w-3.5 transition-transform",
                                showAllMedia && "rotate-180",
                              )}
                          />
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-4 text-center text-[11px] text-muted-foreground">
                      No uploaded media yet. Images you upload here are saved to
                      your festival&apos;s media library.
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold">Solid color</p>
                  <div className="grid grid-cols-5 gap-2">
                    {BACKGROUND_SWATCHES.map((color) => (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        className="aspect-square w-full rounded-full border-2 border-white shadow ring-1 ring-border transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                        onClick={() =>
                          updateBackground({
                            type: "solid",
                            color,
                            imageUrl: undefined,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>

                <Dialog
                  open={!!previewImage}
                  onOpenChange={(open) => !open && setPreviewImage(null)}
                >
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Image preview</DialogTitle>
                      <DialogDescription>
                        Preview this uploaded image before importing it as the
                        canvas background.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex max-h-[55vh] items-center justify-center overflow-hidden rounded-md border bg-muted">
                      {previewImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewImage.url}
                          alt=""
                          className="max-h-[55vh] max-w-full object-contain"
                        />
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPreviewImage(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          if (!previewImage) return;
                          applyImageAsBackground(previewImage.url);
                          toast.success("Background updated");
                          setPreviewImage(null);
                        }}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Import as background
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {navPanel === "layers" && doc && (
              <div className="space-y-1">
                {[...sortedElements].reverse().map((el) => (
                  <div
                    key={el.id}
                    className={`flex items-center gap-1 rounded-lg border px-2 py-2 text-xs ${
                      selectedId === el.id
                        ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                        : "border-transparent bg-background"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left font-medium"
                      onClick={() => setSelectedId(el.id)}
                    >
                      {el.name}
                    </button>
                    <button
                      type="button"
                      className="px-1 text-muted-foreground hover:text-foreground"
                      onClick={() => moveLayer(el.id, "up")}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="px-1 text-muted-foreground hover:text-foreground"
                      onClick={() => moveLayer(el.id, "down")}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-destructive"
                      onClick={() => removeElement(el.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </aside>
  );
}
