"use client";

import {
  ImagePlus,
  Loader2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Upload,
} from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { uploadImageToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import {
  addGalleryImagesAction,
  deleteGalleryImageAction,
  deleteGalleryImagesAction,
} from "@/server/actions/gallery.actions";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { cn } from "@/lib/utils";
import { useFestivalReadOnly } from "@/hooks/useFestivalReadOnly";

type ImageRecord = { id: string; url: string; order: number };

interface GalleryClientProps {
  festivalId: string;
  festivalSlug: string;
  initialImages: ImageRecord[];
}

export function GalleryClient({
  festivalId,
  festivalSlug,
  initialImages,
}: GalleryClientProps) {
  const { isReadOnly } = useFestivalReadOnly();
  const [images, setImages] = useState<ImageRecord[]>(initialImages);
  const [pendingUpload, setPendingUpload] = useState<{
    files: File[];
    previewUrls: string[];
  } | null>(null);
  const [uploadModalUploading, setUploadModalUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs when pending upload is cleared or component unmounts
  useEffect(() => {
    return () => {
      if (pendingUpload?.previewUrls) {
        pendingUpload.previewUrls.forEach((url) => URL.revokeObjectURL(url));
      }
    };
  }, [pendingUpload]);

  const openUploadModal = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const fileList = input.files;
      if (!fileList?.length) return;
      // Copy to array immediately; clearing value can invalidate FileList in some browsers
      const files = Array.from(fileList);
      input.value = ""; // reset so same file can be selected again
      // Prefer image/* types; some systems report type as "" so allow those too
      const imageFiles =
        files.filter((f) => f.type.startsWith("image/")).length > 0
          ? files.filter((f) => f.type.startsWith("image/"))
          : files;
      if (imageFiles.length === 0) {
        toast.error("Please select image files.");
        return;
      }
      const previewUrls = imageFiles.map((f) => URL.createObjectURL(f));
      setPendingUpload({ files: imageFiles, previewUrls });
    },
    [],
  );

  const closeUploadModal = useCallback(() => {
    if (uploadModalUploading) return;
    if (pendingUpload?.previewUrls) {
      pendingUpload.previewUrls.forEach((url) => URL.revokeObjectURL(url));
    }
    setPendingUpload(null);
  }, [uploadModalUploading, pendingUpload]);

  const removePendingFile = useCallback((index: number) => {
    setPendingUpload((prev) => {
      if (!prev || (prev.files?.length ?? 0) <= 1) {
        if (prev?.previewUrls[index]) URL.revokeObjectURL(prev.previewUrls[index]);
        return (prev?.files?.length ?? 0) <= 1 ? null : prev;
      }
      if (prev.previewUrls[index]) URL.revokeObjectURL(prev.previewUrls[index]);
      const files = prev.files.filter((_, i) => i !== index);
      const previewUrls = prev.previewUrls.filter((_, i) => i !== index);
      return { files, previewUrls };
    });
  }, []);

  const confirmUploadAll = useCallback(async () => {
    if (!pendingUpload?.files.length || isReadOnly) return;
    if (!isCloudinaryConfigured()) {
      toast.error("Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_* env.");
      return;
    }
    setUploadModalUploading(true);
    setUploadProgress({ current: 0, total: pendingUpload.files.length });
    const files = pendingUpload.files;
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        const url = await uploadImageToCloudinary(files[i], "gallery");
        if (url) urls.push(url);
      }
      if (urls.length === 0) {
        toast.error("Upload failed.");
        setUploadModalUploading(false);
        closeUploadModal();
        return;
      }
      const res = await addGalleryImagesAction(festivalId, urls);
      if (res.success) {
        toast.success(
          urls.length === 1 ? "Photo added." : `${urls.length} photos added.`,
        );
        if (pendingUpload?.previewUrls) {
          pendingUpload.previewUrls.forEach((url) => URL.revokeObjectURL(url));
        }
        setPendingUpload(null);
        setUploadModalUploading(false);
        window.location.reload();
      } else {
        toast.error(res.error ?? "Failed to add photos.");
        setUploadModalUploading(false);
      }
    } catch {
      toast.error("Upload failed.");
      setUploadModalUploading(false);
    }
  }, [festivalId, pendingUpload, closeUploadModal]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (isReadOnly) return;
      const res = await deleteGalleryImageAction(festivalId, id);
      if (res.success) {
        setImages((prev) => prev.filter((i) => i.id !== id));
        setSelectedIds((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
        if (lightboxIndex !== null) {
          const next = images.length <= 1 ? null : Math.min(lightboxIndex, images.length - 2);
          setLightboxIndex(next);
        }
        toast.success("Photo removed.");
        window.location.reload();
      } else {
        toast.error(res.error ?? "Failed to remove.");
      }
    },
    [festivalId, lightboxIndex, images.length],
  );

  const handleBulkDelete = useCallback(async () => {
    if (isReadOnly) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setDeletingIds(new Set(ids));
    try {
      const res = await deleteGalleryImagesAction(festivalId, ids);
      if (res.success) {
        setImages((prev) => prev.filter((i) => !selectedIds.has(i.id)));
        setSelectedIds(new Set());
        toast.success(
          ids.length === 1 ? "Photo removed." : `${ids.length} photos removed.`,
        );
        window.location.reload();
      } else {
        toast.error(res.error ?? "Failed to remove.");
      }
    } finally {
      setDeletingIds(new Set());
    }
  }, [festivalId, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(images.map((i) => i.id).filter(Boolean)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const goPrev = () =>
    setLightboxIndex((i) =>
      i === null ? null : i <= 0 ? images.length - 1 : i - 1,
    );
  const goNext = () =>
    setLightboxIndex((i) =>
      i === null ? null : i >= images.length - 1 ? 0 : i + 1,
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Gallery
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <HowItWorksButton
            title="How the Gallery works"
            description="Photos appear on your festival's public gallery page."
          >
            <p className="text-sm text-muted-foreground">
              Upload images to show on your festival&apos;s public gallery. You
              can upload multiple photos at once, reorder them, and remove single
              or multiple images.
            </p>
            <p className="text-sm text-muted-foreground">
              Use the lightbox to preview the gallery. Photos are displayed in
              the order you set; drag to reorder or use bulk delete for selected
              items.
            </p>
          </HowItWorksButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={openUploadModal}
          />
          <Button
            size="sm"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadOnly}
          >
            <ImagePlus className="h-4 w-4 sm:mr-2" />
            Upload photos
          </Button>
        </div>
      </div>

      {hasSelection && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium">{selectedCount} selected</span>
              <Button variant="ghost" size="sm" onClick={selectAll} disabled={isReadOnly}>
            Select all
          </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection} disabled={isReadOnly}>
            Clear
          </Button>
          <DeleteDialog
            title="Remove selected photos"
            description={`${selectedCount} photo(s) will be removed from the gallery.`}
            onDelete={handleBulkDelete}
            isDeleting={deletingIds.size > 0}
            trigger={
              <Button variant="destructive" size="sm" disabled={isReadOnly}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete selected
              </Button>
            }
          />
        </div>
      )}

      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 flex flex-col items-center justify-center py-16 px-4 text-center">
          <ImagePlus className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No photos yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload photos to show on your public gallery page.
          </p>
          <Button
            variant="outline"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadOnly}
          >
            Upload photos
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, index) => {
            const isSelected = img.id ? selectedIds.has(img.id) : false;
            return (
              <div
                key={img.id || img.url}
                className={cn(
                  "group relative aspect-square rounded-xl overflow-hidden bg-muted border",
                  index % 5 === 0 && "sm:col-span-2 sm:row-span-2",
                  isSelected && "ring-2 ring-primary ring-offset-2",
                )}
              >
                <button
                  type="button"
                  className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 ring-primary ring-inset"
                  onClick={() => openLightbox(index)}
                >
                  <img
                    src={img.url}
                    alt=""
                    className="w-full h-full object-cover transition group-hover:scale-105"
                  />
                </button>
                {img.id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(img.id);
                    }}
                    disabled={isReadOnly}
                    className={cn(
                      "absolute top-2 left-2 z-10 p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition",
                      isSelected && "bg-primary text-primary-foreground",
                    )}
                    aria-label={isSelected ? "Deselect" : "Select"}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5" />
                    ) : (
                      <Square className="h-5 w-5 opacity-80" />
                    )}
                  </button>
                )}
                <div className="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                  <DeleteDialog
                    title="Remove photo"
                    description="This photo will be removed from the gallery."
                    onDelete={() => handleDelete(img.id)}
                    isDeleting={false}
                    trigger={
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full shadow"
                        disabled={isReadOnly}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload preview modal: list of selected images, then Upload all */}
      <Dialog open={!!pendingUpload} onOpenChange={(open) => !open && closeUploadModal()}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden gap-4 p-4">
          <DialogHeader className="shrink-0">
            <DialogTitle>Upload photos</DialogTitle>
            <DialogDescription>
              {pendingUpload
                ? `${pendingUpload.files.length} photo(s) selected. Review and click Upload all to add them to the gallery.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {pendingUpload && (
            <>
              <div className="relative flex-1 flex flex-col min-h-[200px] max-h-[50vh] overflow-hidden">
                <ScrollArea className="h-full rounded-lg border p-2">
                  <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 pr-2">
                    {pendingUpload.files.map((file, index) => (
                      <li
                        key={index}
                        className="relative group/item rounded-lg overflow-hidden border bg-muted aspect-square"
                      >
                        <img
                          src={pendingUpload.previewUrls[index]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <p className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-2 py-1 truncate">
                          {file.name}
                        </p>
                        {!uploadModalUploading && (
                          <button
                            type="button"
                            onClick={() => removePendingFile(index)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover/item:opacity-100 transition"
                            aria-label="Remove"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
                {uploadModalUploading && (
                  <div className="absolute inset-0 bg-background/90 rounded-lg flex flex-col items-center justify-center gap-3 z-10">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-medium">
                      Uploading {uploadProgress.current} of {uploadProgress.total}…
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter className="shrink-0 flex-row gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={closeUploadModal}
                  disabled={uploadModalUploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmUploadAll}
                  disabled={uploadModalUploading}
                >
                  {uploadModalUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload all
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={lightboxIndex !== null} onOpenChange={() => closeLightbox()}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 overflow-hidden bg-black/95 border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Gallery preview</DialogTitle>
          </DialogHeader>
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {lightboxIndex !== null && images[lightboxIndex] && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <img
                  src={images[lightboxIndex].url}
                  alt=""
                  className="max-h-[70vh] w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Next"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            )}
          </div>
          <div className="p-2 flex justify-between items-center bg-black/50 text-white text-sm">
            <span>
              {lightboxIndex !== null && images[lightboxIndex]
                ? `${lightboxIndex + 1} / ${images.length}`
                : ""}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={closeLightbox}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
