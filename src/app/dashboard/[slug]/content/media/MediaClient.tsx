"use client";

import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Play,
  Plus,
  Square,
  Trash2,
  Upload,
  X,
  Youtube,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCloudinaryUpload } from "@/api/client";
import {
  useCreateMediaItem,
  useCreateMediaVideo,
  useDeleteMediaItem,
  useDeleteMediaVideo,
  useMedia,
  useMediaVideos,
} from "@/api/client/media";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/core/utils/cn";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import {
  extractInstagramId,
  extractYouTubeId,
  getYouTubeThumbnail,
} from "@/features/media/utils/youtube";
import { toast } from "@/lib/toast";

type ImageRecord = { id: string; url: string; order: number };
type VideoRecord = { id: string; url: string; order: number };

interface MediaClientProps {
  festivalId: string;
  festivalSlug: string;
  initialImages: ImageRecord[];
  initialVideos: VideoRecord[];
}

export function MediaClient({
  festivalId,
  festivalSlug: _festivalSlug,
  initialImages,
  initialVideos,
}: MediaClientProps) {
  const dirtySourceId = `media:${festivalId}`;
  const { registerDirtySource, unregisterDirtySource, setDirty } =
    useUnsavedChanges();
  const { isReadOnly } = useFestivalReadOnly();
  
  const { data: serverImages } = useMedia(festivalId);
  const { data: serverVideos } = useMediaVideos(festivalId);
  
  const images = serverImages ?? initialImages;
  const videos = serverVideos ?? initialVideos;

  const [photosPageIndex, setPhotosPageIndex] = useState(0);
  const [videosPageIndex, setVideosPageIndex] = useState(0);
  const pageSize = 10;
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const createMediaVideo = useCreateMediaVideo();
  const deleteMediaVideo = useDeleteMediaVideo();
  const [pendingUpload, setPendingUpload] = useState<{
    files: File[];
    previewUrls: string[];
  } | null>(null);
  const [uploadModalUploading, setUploadModalUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const uploadMutation = useCloudinaryUpload();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createMediaItem = useCreateMediaItem();
  const deleteMediaItem = useDeleteMediaItem();

  // Revoke object URLs when pending upload is cleared or component unmounts
  useEffect(() => {
    return () => {
      if (pendingUpload?.previewUrls) {
        pendingUpload.previewUrls.forEach((url) => {
          URL.revokeObjectURL(url);
        });
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
      setUploadModalTab("photos");
      setUploadModalOpen(true);
    },
    [],
  );

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadModalTab, setUploadModalTab] = useState<"photos" | "videos">("photos");

  const closeUploadModal = useCallback(() => {
    if (uploadModalUploading) return;
    if (pendingUpload?.previewUrls) {
      pendingUpload.previewUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    }
    setPendingUpload(null);
    setUploadModalOpen(false);
    setVideoUrlInput("");
  }, [uploadModalUploading, pendingUpload]);

  const removePendingFile = useCallback((index: number) => {
    setPendingUpload((prev) => {
      if (!prev || (prev.files?.length ?? 0) <= 1) {
        if (prev?.previewUrls[index])
          URL.revokeObjectURL(prev.previewUrls[index]);
        return (prev?.files?.length ?? 0) <= 1 ? null : prev;
      }
      if (prev.previewUrls[index]) URL.revokeObjectURL(prev.previewUrls[index]);
      const files = prev.files.filter((_, i) => i !== index);
      const previewUrls = prev.previewUrls.filter((_, i) => i !== index);
      return { files, previewUrls };
    });
  }, []);

  const confirmUploadAll = useCallback(async () => {
    if (uploadModalTab === "videos") {
      // Handle video upload
      if (isReadOnly) return;
      const url = videoUrlInput.trim();
      if (!url) return;
      if (!extractYouTubeId(url) && !extractInstagramId(url)) {
        toast.error("Enter a valid YouTube or Instagram link.");
        return;
      }
      setUploadModalUploading(true);
      try {
        await createMediaVideo.mutateAsync({
          festivalId,
          data: { festivalId, url },
        });
        toast.success("Video added.");
        closeUploadModal();
      } catch {
        // error toast handled by the mutation hook
      } finally {
        setUploadModalUploading(false);
      }
      return;
    }

    if (!pendingUpload?.files.length || isReadOnly) return;
    if (
      !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME === "demo"
    ) {
      toast.error(
        "Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_* env.",
      );
      return;
    }
    setUploadModalUploading(true);
    setUploadProgress({ current: 0, total: pendingUpload.files.length });
    const files = pendingUpload.files;
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        const result = await uploadMutation.mutateAsync({
          file: files[i],
          folder: "media",
          festivalId,
        });
        if (result?.url) urls.push(result.url);
      }
      if (urls.length === 0) {
        toast.error("Upload failed.");
        setUploadModalUploading(false);
        closeUploadModal();
        return;
      }
      try {
        await Promise.all(
          urls.map((url) =>
            createMediaItem.mutateAsync({
              festivalId,
              data: { festivalId, url },
            }),
          ),
        );
        toast.success(
          urls.length === 1 ? "Photo added." : `${urls.length} photos added.`,
        );
      } catch {
        toast.error("Failed to save photos.");
      }
    } catch {
      toast.error("Failed to upload to Cloudinary.");
    } finally {
      setUploadModalUploading(false);
      closeUploadModal();
    }
  }, [
    uploadModalTab,
    videoUrlInput,
    pendingUpload,
    isReadOnly,
    festivalId,
    uploadMutation,
    createMediaItem,
    createMediaVideo,
    closeUploadModal,
  ]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (isReadOnly) return;
      try {
        await deleteMediaItem.mutateAsync({ festivalId, imageId: id });
        setSelectedIds((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
        if (lightboxIndex !== null) {
          const next =
            images.length <= 1
              ? null
              : Math.min(lightboxIndex, images.length - 2);
          setLightboxIndex(next);
        }
        toast.success("Photo removed.");
      } catch {
        toast.error("Failed to remove.");
      }
    },
    [
      festivalId,
      lightboxIndex,
      images.length,
      isReadOnly,
      deleteMediaItem.mutateAsync,
    ],
  );

  const handleBulkDelete = useCallback(async () => {
    if (isReadOnly) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setDeletingIds(new Set(ids));
    try {
      await Promise.all(
        ids.map((id) =>
          deleteMediaItem.mutateAsync({ festivalId, imageId: id }),
        ),
      );
      setSelectedIds(new Set());
      toast.success(
        ids.length === 1 ? "Photo removed." : `${ids.length} photos removed.`,
      );
    } catch {
      toast.error("Failed to remove.");
    } finally {
      setDeletingIds(new Set());
    }
  }, [festivalId, selectedIds, isReadOnly, deleteMediaItem.mutateAsync]);

  const handleDeleteVideo = useCallback(
    async (videoId: string) => {
      if (isReadOnly) return;
      try {
        await deleteMediaVideo.mutateAsync({ festivalId, videoId });
        toast.success("Video removed.");
      } catch {
        // error toast handled by the mutation hook
      }
    },
    [deleteMediaVideo, festivalId, isReadOnly],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(images.map((i) => i.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const hasSelection = selectedIds.size > 0;
  const selectedCount = selectedIds.size;

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const goNext = useCallback(() => {
    if (lightboxIndex !== null && lightboxIndex < images.length - 1)
      setLightboxIndex(lightboxIndex + 1);
  }, [lightboxIndex, images.length]);
  const goPrev = useCallback(() => {
    if (lightboxIndex !== null && lightboxIndex > 0)
      setLightboxIndex(lightboxIndex - 1);
  }, [lightboxIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  useEffect(() => {
    registerDirtySource(dirtySourceId);
    return () => unregisterDirtySource(dirtySourceId);
  }, [dirtySourceId, registerDirtySource, unregisterDirtySource]);

  useEffect(() => {
    if (!pendingUpload?.files.length) {
      setDirty(dirtySourceId, false);
      return;
    }
    const hasUnsavedSelection = Boolean(pendingUpload?.files.length);
    setDirty(dirtySourceId, hasUnsavedSelection);
  }, [dirtySourceId, isReadOnly, pendingUpload?.files.length, setDirty]);

  return (
    <div className="space-y-6">
      <div className="flex flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-row items-center gap-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Media</h1>
          <Button
            size="sm"
            onClick={() => setUploadModalOpen(true)}
            disabled={isReadOnly}
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Upload</span>
          </Button>
        </div>
        <HowItWorksButton
          title="How Media works"
          description="Photos and YouTube videos appear together on your festival's public media page."
        >
          <p className="text-sm text-muted-foreground">
            Upload images to show on your festival&apos;s public media. You can
            upload multiple photos at once, reorder them, and remove single or
            multiple images.
          </p>
          <p className="text-sm text-muted-foreground">
            Paste YouTube links in the Videos tab to feature highlight reels and
            coverage alongside your photos.
          </p>
        </HowItWorksButton>
      </div>

      <Tabs defaultValue="photos">
        <TabsList className="w-full">
          <TabsTrigger className="w-1/2" value="photos">
            Photos
          </TabsTrigger>
          <TabsTrigger className="w-1/2" value="videos">
            Videos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="space-y-6 pt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={openUploadModal}
            />

          {hasSelection && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">{selectedCount} selected</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={isReadOnly}
              >
                Select all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={isReadOnly}
              >
                Clear
              </Button>
              <DeleteDialog
                title="Remove selected photos"
                description={`${selectedCount} photo(s) will be removed from the media.`}
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
                Upload photos to show on your public media page.
              </p>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setUploadModalTab("photos");
                  setUploadModalOpen(true);
                }}
                disabled={isReadOnly}
              >
                Upload photos
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images
                .slice(
                  photosPageIndex * pageSize,
                  (photosPageIndex + 1) * pageSize,
                )
                .map((img, index) => {
                  const isSelected = img.id ? selectedIds.has(img.id) : false;
                  return (
                    <div
                      key={img.id || img.url}
                      className={cn(
                        "group relative aspect-square rounded-xl overflow-hidden bg-muted border",
                        isSelected && "ring-2 ring-primary ring-offset-2",
                      )}
                    >
                      <button
                        type="button"
                        className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 ring-primary ring-inset"
                        onClick={() => openLightbox(index)}
                      >
                        <Image
                          src={img.url}
                          alt="Media image"
                          fill
                          className="object-cover transition group-hover:scale-105"
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
                          description="This photo will be removed from the media."
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

          {images.length > pageSize && (
            <DataTablePagination
              pageIndex={photosPageIndex}
              pageCount={Math.ceil(images.length / pageSize)}
              onPageChange={(page) => setPhotosPageIndex(page)}
              className="mt-4"
            />
          )}
        </TabsContent>

        <TabsContent value="videos" className="space-y-6 pt-4">


          {videos.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/30 flex flex-col items-center justify-center py-16 px-4 text-center">
              <Youtube className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No videos yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Add YouTube or Instagram links to show on your public media page.
              </p>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setUploadModalTab("videos");
                  setUploadModalOpen(true);
                }}
                disabled={isReadOnly}
              >
                Add video
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {videos
                .slice(
                  videosPageIndex * pageSize,
                  (videosPageIndex + 1) * pageSize,
                )
                .map((video) => {
                  const videoId = extractYouTubeId(video.url);
                  const igId = extractInstagramId(video.url);
                  
                  return (
                    <div
                      key={video.id}
                      className="group relative aspect-video rounded-xl overflow-hidden bg-muted border"
                    >
                      {playingVideoId === video.id ? (
                        videoId ? (
                          <iframe
                            title="YouTube video player"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                            className="absolute inset-0 w-full h-full"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                          />
                        ) : igId ? (
                          <iframe
                            title="Instagram video player"
                            src={`https://www.instagram.com/p/${igId}/embed`}
                            className="absolute inset-0 w-full h-full"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                          />
                        ) : null
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPlayingVideoId(video.id)}
                          className="absolute inset-0 w-full h-full cursor-pointer focus:outline-none"
                        >
                          {videoId ? (
                            <Image
                              src={getYouTubeThumbnail(videoId)}
                              alt="YouTube video thumbnail"
                              fill
                              className="object-cover transition group-hover:scale-105"
                            />
                          ) : igId ? (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                               <span className="text-white font-semibold">Instagram Video</span>
                            </div>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Youtube className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition">
                            <Play className="h-8 w-8 text-white" />
                          </div>
                        </button>
                      )}
                      <div className="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition">
                        <DeleteDialog
                          title="Remove video"
                          description="This video will be removed from the media."
                          onDelete={() => handleDeleteVideo(video.id)}
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

          {videos.length > pageSize && (
            <DataTablePagination
              pageIndex={videosPageIndex}
              pageCount={Math.ceil(videos.length / pageSize)}
              onPageChange={(page) => setVideosPageIndex(page)}
              className="mt-4"
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Upload preview modal: tabs for Photo / Video */}
      <Dialog
        open={uploadModalOpen}
        onOpenChange={(open) => !open && closeUploadModal()}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden gap-4 p-4">
          <DialogHeader className="shrink-0">
            <DialogTitle>Upload media</DialogTitle>
            <DialogDescription>
              Select media type to upload to your festival's public media.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={uploadModalTab}
            onValueChange={(v) => setUploadModalTab(v as "photos" | "videos")}
            className="flex flex-col overflow-hidden"
          >
            <TabsList className="w-full">
              <TabsTrigger value="photos" className="w-1/2">PHOTO</TabsTrigger>
              <TabsTrigger value="videos" className="w-1/2">VIDEO</TabsTrigger>
            </TabsList>
            
            <TabsContent value="photos" className="flex-1 overflow-hidden flex flex-col min-h-[200px] max-h-[50vh] mt-4">
              {!pendingUpload?.files.length ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center bg-muted/30">
                  <ImagePlus className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">No photos selected.</p>
                  <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isReadOnly}>
                    Select Photos
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <p className="text-sm text-muted-foreground mb-2">
                    {pendingUpload.files.length} photo(s) selected. Review and click Upload all to add them to the media.
                  </p>
                  <div className="relative flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="h-full rounded-lg border p-2">
                      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 pr-2">
                        {pendingUpload.files.map((file, index) => (
                          <li
                            key={index}
                            className="relative group/item rounded-lg overflow-hidden border bg-muted aspect-square"
                          >
                            <Image
                              src={pendingUpload.previewUrls[index]}
                              alt="Preview"
                              fill
                              className="object-cover"
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
                </div>
              )}
            </TabsContent>

            <TabsContent value="videos" className="flex-1 overflow-hidden flex flex-col mt-4">
              <div className="space-y-4">
                <Input
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  placeholder="Paste a YouTube or Instagram link (e.g. https://youtube.com/watch?v=...)"
                  disabled={isReadOnly || uploadModalUploading}
                  className="h-10"
                />
                <div className="rounded-xl border border-dashed bg-muted/30 flex flex-col items-center justify-center aspect-video overflow-hidden relative">
                  {videoUrlInput.trim() ? (
                    extractYouTubeId(videoUrlInput) ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${extractYouTubeId(videoUrlInput)}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Video Preview"
                      />
                    ) : extractInstagramId(videoUrlInput) ? (
                      <iframe
                        src={`https://www.instagram.com/p/${extractInstagramId(videoUrlInput)}/embed`}
                        className="w-full h-full"
                        allowTransparency
                        allowFullScreen
                        title="Video Preview"
                      />
                    ) : (
                      <>
                        <Youtube className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-sm font-medium text-destructive">Invalid URL format</p>
                      </>
                    )
                  ) : (
                    <>
                      <Youtube className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-sm font-medium">Video preview will appear here</p>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="shrink-0 flex-row gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={closeUploadModal}
              disabled={uploadModalUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUploadAll}
              disabled={
                uploadModalUploading ||
                (uploadModalTab === "photos" && !pendingUpload?.files.length) ||
                (uploadModalTab === "videos" && !videoUrlInput.trim())
              }
            >
              {uploadModalUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadModalTab === "photos" ? "Upload all" : "Add video"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={() => closeLightbox()}
      >
        <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 overflow-hidden bg-black/95 border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Media preview</DialogTitle>
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
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src={images[lightboxIndex].url}
                    alt="Lightbox view"
                    fill
                    className="object-contain"
                    quality={90}
                  />
                </div>
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
