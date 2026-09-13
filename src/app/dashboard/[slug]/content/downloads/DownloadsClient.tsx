"use client";

import {
  ArrowDownToLine,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  useCreateDownload,
  useDeleteDownload,
  useDownloads,
  useUpdateDownload,
} from "@/api/client/downloads";
import {
  DOWNLOAD_CATEGORY_LABELS,
  DOWNLOAD_FILE_TYPE_COLORS,
  DOWNLOAD_FILE_TYPE_LABELS,
  type DownloadCategory,
  type DownloadFileType,
} from "@/api/contracts/downloads";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, parseInstant } from "@/core/datetime";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";

type Download = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: DownloadFileType;
  category: DownloadCategory;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

interface DownloadsClientProps {
  festivalId: string;
  festivalSlug: string;
  initialDownloads: Download[];
}

const FILE_TYPES: DownloadFileType[] = [
  "PDF",
  "DOC",
  "XLS",
  "JPG",
  "PNG",
  "ZIP",
  "OTHER",
];

const CATEGORIES: DownloadCategory[] = [
  "SCHEDULE",
  "RULES",
  "FORMS",
  "BROCHURE",
  "RESULTS",
  "OTHER",
];

const emptyForm = {
  title: "",
  description: "",
  fileUrl: "",
  fileType: "PDF" as DownloadFileType,
  category: "OTHER" as DownloadCategory,
  published: false,
};

export function DownloadsClient({
  festivalId,
  festivalSlug,
  initialDownloads,
}: DownloadsClientProps) {
  const dirtySourceId = `downloads:${festivalId}`;
  const { registerDirtySource, unregisterDirtySource, setDirty } =
    useUnsavedChanges();
  const { isReadOnly } = useFestivalReadOnly();
  const [downloads, setDownloads] = useState<Download[]>(initialDownloads);
  const {
    data: downloadsData,
    isLoading,
    isError,
    error,
    refetch: refetchDownloads,
  } = useDownloads(festivalId);
  const createDownload = useCreateDownload();
  const updateDownload = useUpdateDownload();
  const deleteDownload = useDeleteDownload();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState(
    JSON.stringify(emptyForm),
  );
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 9;
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const hasUnsavedForm =
    dialogOpen && JSON.stringify(form) !== initialFormSnapshot;

  const openCreate = () => {
    if (isReadOnly) return;
    setEditingId(null);
    setForm(emptyForm);
    setInitialFormSnapshot(JSON.stringify(emptyForm));
    setDialogOpen(true);
  };

  const openEdit = (row: Download) => {
    if (isReadOnly) return;
    const next = {
      title: row.title,
      description: row.description ?? "",
      fileUrl: row.fileUrl,
      fileType: row.fileType,
      category: row.category,
      published: !!row.publishedAt,
    };
    setEditingId(row.id);
    setForm(next);
    setInitialFormSnapshot(JSON.stringify(next));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    if (!form.title.trim()) return;
    if (!form.fileUrl.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        fileUrl: form.fileUrl.trim(),
        fileType: form.fileType,
        category: form.category,
        publishedAt: form.published ? new Date().toISOString() : null,
      };
      if (editingId) {
        await updateDownload.mutateAsync({
          festivalId,
          downloadId: editingId,
          data: payload,
        });
      } else {
        await createDownload.mutateAsync({
          festivalId,
          data: payload,
        });
      }
      setDirty(dirtySourceId, false);
      setDialogOpen(false);
      refetchDownloads();
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
      await deleteDownload.mutateAsync({ festivalId, downloadId: id });
      setDeleteConfirmId(null);
      setDownloads((p) => p.filter((x) => x.id !== id));
      refetchDownloads();
    } catch {
      // toast handled by the hook
    }
  };

  const handleTogglePublish = async (row: Download) => {
    if (isReadOnly) return;
    try {
      await updateDownload.mutateAsync({
        festivalId,
        downloadId: row.id,
        data: {
          publishedAt: row.publishedAt ? null : new Date().toISOString(),
        },
      });
      refetchDownloads();
    } catch {
      // toast handled by the hook
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Downloads
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Files appear on your public downloads page.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <Skeleton className="aspect-[4/3] rounded-t-xl rounded-b-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
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
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Downloads
        </h1>
        <div className="text-center py-8 text-destructive">
          Error: {error.message}
        </div>
      </div>
    );
  }

  const displayDownloads = downloadsData ?? downloads;
  const publicLink = `/${festivalSlug}/downloads`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Downloads
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Files appear on your public downloads page.
            <Link
              href={publicLink}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 underline underline-offset-2 hover:text-foreground"
            >
              View public page
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HowItWorksButton
            title="How Downloads work"
            description="Upload brochures, schedules, rules and more for visitors and participants to download."
          >
            <p className="text-sm text-muted-foreground">
              Add a file URL plus a title, choose its category and file type,
              then publish. Drafts stay private until you publish them.
            </p>
          </HowItWorksButton>
          <Button size="sm" onClick={openCreate} disabled={isReadOnly}>
            <Plus className="h-4 w-4 sm:mr-2" />
            Add download
          </Button>
        </div>
      </div>

      {displayDownloads.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ArrowDownToLine className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No downloads yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Add a downloadable file (PDF, DOC, XLS, image, ZIP) and pick a
              category to publish it on the public downloads page.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-6"
              onClick={openCreate}
              disabled={isReadOnly}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add download
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayDownloads
              .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
              .map((row) => (
                <Card
                  key={row.id}
                  className="overflow-hidden transition-shadow hover:shadow-md"
                >
                  <div
                    aria-hidden
                    className="aspect-[4/3] flex items-center justify-center"
                    style={{
                      backgroundColor: `${DOWNLOAD_FILE_TYPE_COLORS[row.fileType]}1F`,
                    }}
                  >
                    <span
                      className="inline-flex h-16 w-16 items-center justify-center rounded-2xl font-display text-xl font-semibold text-white"
                      style={{
                        backgroundColor:
                          DOWNLOAD_FILE_TYPE_COLORS[row.fileType],
                      }}
                    >
                      {DOWNLOAD_FILE_TYPE_LABELS[row.fileType]}
                    </span>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          {DOWNLOAD_CATEGORY_LABELS[row.category]}
                        </p>
                        <h3 className="font-semibold text-sm leading-snug line-clamp-2 mt-0.5">
                          {row.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {row.publishedAt
                            ? formatDate(parseInstant(row.publishedAt), {
                                style: "medium",
                              })
                            : "Draft"}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 rounded-full shrink-0"
                            aria-label="Actions"
                            disabled={isReadOnly}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem asChild>
                            <a
                              href={row.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Open file
                            </a>
                          </DropdownMenuItem>
                          {!isReadOnly && (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(row)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleTogglePublish(row)}
                              >
                                {row.publishedAt ? (
                                  <>
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Unpublish
                                  </>
                                ) : (
                                  <>
                                    <Globe className="h-4 w-4 mr-2" />
                                    Publish
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteConfirmId(row.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          {displayDownloads.length > pageSize && (
            <DataTablePagination
              pageIndex={pageIndex}
              pageCount={Math.ceil(displayDownloads.length / pageSize)}
              onPageChange={(page) => setPageIndex(page)}
              className="mt-4"
            />
          )}
        </>
      )}

      <DeleteDialog
        title="Delete download"
        description="This cannot be undone."
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onDelete={async () => {
          if (deleteConfirmId) await handleDelete(deleteConfirmId);
        }}
        isDeleting={false}
      />

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="max-w-lg sm:max-w-xl flex flex-col h-full p-0 gap-0">
          <div className="flex-1 overflow-y-auto p-6">
            <SheetHeader>
              <SheetTitle>
                {editingId ? "Edit download" : "Add download"}
              </SheetTitle>
              <SheetDescription>
                Paste a URL to any hosted file (Drive, Dropbox, your CDN). Pick
                a category so it groups under the right heading on the public
                page.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-6">
              <div className="grid gap-2">
                <Label htmlFor="dl-title">Title</Label>
                <Input
                  id="dl-title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Concept Note"
                  disabled={isReadOnly}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dl-file-url">File URL</Label>
                <Input
                  id="dl-file-url"
                  value={form.fileUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fileUrl: e.target.value }))
                  }
                  placeholder="https://drive.google.com/..."
                  disabled={isReadOnly}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>File type</Label>
                  <Select
                    value={form.fileType}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        fileType: v as DownloadFileType,
                      }))
                    }
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {DOWNLOAD_FILE_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        category: v as DownloadCategory,
                      }))
                    }
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {DOWNLOAD_CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dl-description">Description (optional)</Label>
                <Textarea
                  id="dl-description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Short note shown under the title"
                  rows={3}
                  className="resize-none"
                  disabled={isReadOnly}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dl-published"
                  checked={form.published}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, published: e.target.checked }))
                  }
                  className="rounded border"
                  disabled={isReadOnly}
                />
                <Label htmlFor="dl-published">Publish now</Label>
              </div>
            </div>
          </div>
          <SheetFooter className="p-6 border-t shrink-0">
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
                saving ||
                isReadOnly ||
                !hasUnsavedForm ||
                !form.title.trim() ||
                !form.fileUrl.trim()
              }
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Update" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
