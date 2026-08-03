"use client";

import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Eraser,
  Eye,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { clearAllDevEditorTemplates } from "@/components/editor/editor-template-storage";
import { clearFestivalEditorLocalData } from "@/components/festival/posters/clear-editor-local-data";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/core/utils/cn";
import {
  clearAllPosterTemplatesAction,
  deletePosterTemplateDraftAction,
  listPosterTemplatesAction,
  unpublishPosterTemplateAction,
} from "@/features/posters/actions/poster-template.actions";
import type { PosterTemplateListItem } from "@/features/posters/types/poster-template.types";
import { festivalEditorPath } from "@/features/posters/utils/poster-routes";

const TYPE_LABELS: Record<string, string> = {
  RESULT: "Result poster",
  CANDIDATE_CARD: "Candidate card",
  CERTIFICATE: "Certificate",
  TEAM_POINTS: "Team points",
};

function formatUpdatedAt(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function TemplateStatusBadge({
  status,
}: {
  status: PosterTemplateListItem["status"];
}) {
  const isPublished = status === "PUBLISHED";
  return (
    <Badge
      className={cn(
        "shrink-0 border-transparent text-[10px] font-semibold uppercase tracking-wide",
        isPublished
          ? "bg-green-500/15 text-green-700 dark:text-green-400"
          : "bg-primary/15 text-primary",
      )}
    >
      {isPublished ? "Published" : "Draft"}
    </Badge>
  );
}

function sortTemplates(items: PosterTemplateListItem[]) {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "PUBLISHED" ? -1 : 1;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function TemplatesClient({
  festivalId,
  festivalSlug,
  initialTemplates,
  readOnly,
}: {
  festivalId: string;
  festivalSlug: string;
  initialTemplates: PosterTemplateListItem[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [pending, startTransition] = useTransition();
  const [clearOpen, setClearOpen] = useState(false);

  const sorted = useMemo(() => sortTemplates(templates), [templates]);

  const refresh = () => {
    startTransition(async () => {
      const res = await listPosterTemplatesAction(festivalId);
      if (res.success) setTemplates(res.data);
    });
  };

  const handleUnpublish = (code: string) => {
    startTransition(async () => {
      const res = await unpublishPosterTemplateAction(
        festivalId,
        code,
        festivalSlug,
      );
      if (res.success) {
        toast.success(`Unpublished ${code}`);
        refresh();
        router.refresh();
      } else toast.error(res.error);
    });
  };

  const handleDelete = (code: string) => {
    startTransition(async () => {
      const res = await deletePosterTemplateDraftAction(
        festivalId,
        code,
        festivalSlug,
      );
      if (res.success) {
        toast.success("Template removed");
        refresh();
      } else toast.error(res.error);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-xl font-semibold mb-1">Templates</h2>
          <p className="text-sm text-muted-foreground">
            All poster layouts — drafts and published — in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnly && (
            <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline">
                  <Eraser className="mr-2 h-4 w-4" />
                  Clear all editor data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all editor data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes every template for this festival from the
                    database, clears autosave backups in this browser, and
                    clears the dev /editor playground cache. This cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      startTransition(async () => {
                        clearFestivalEditorLocalData(festivalId);
                        clearAllDevEditorTemplates();
                        const res = await clearAllPosterTemplatesAction(
                          festivalId,
                          festivalSlug,
                        );
                        setClearOpen(false);
                        if (res.success) {
                          setTemplates([]);
                          toast.success(
                            `Cleared ${res.data.deletedCount} template(s) and local editor cache`,
                          );
                          router.refresh();
                        } else {
                          toast.error(res.error);
                        }
                      });
                    }}
                  >
                    Clear everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button asChild>
            <Link href={festivalEditorPath(festivalSlug)}>
              <Pencil className="mr-2 h-4 w-4" />
              Open editor
            </Link>
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No templates yet. Open the editor, design a layout, and save a draft
            or publish when ready.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              festivalSlug={festivalSlug}
              readOnly={readOnly}
              pending={pending}
              onUnpublish={handleUnpublish}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template: t,
  festivalSlug,
  readOnly,
  pending,
  onUnpublish,
  onDelete,
}: {
  template: PosterTemplateListItem;
  festivalSlug: string;
  readOnly?: boolean;
  pending?: boolean;
  onUnpublish: (code: string) => void;
  onDelete: (code: string) => void;
}) {
  const isPublished = t.status === "PUBLISHED";
  const editorHref = festivalEditorPath(festivalSlug, t.code);
  const typeLabel = TYPE_LABELS[t.type] ?? t.type;

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border pl-3.5 transition-all hover:shadow-md",
        isPublished
          ? "border-green-500/25 hover:border-green-500/40"
          : "border-border/80 hover:border-primary/30",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          isPublished ? "bg-green-500/80" : "bg-primary/50",
        )}
        aria-hidden
      />

      <CardHeader className="space-y-2 pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-mono text-base leading-snug tracking-tight">
            {t.code}
          </CardTitle>
          <TemplateStatusBadge status={t.status} />
        </div>
        <p className="text-xs text-muted-foreground">{typeLabel}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pb-4 pt-0">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">
            {t.width} × {t.height} px
          </span>
          <span>Updated {formatUpdatedAt(t.updatedAt)}</span>
        </div>

        {isPublished && (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Live
          </p>
        )}

        <div className="mt-3 border-t border-border/60 pt-3">
          {isPublished ? (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                asChild
                disabled={pending}
              >
                <Link href={editorHref}>
                  <Eye className="mr-2 h-3.5 w-3.5" />
                  Review
                </Link>
              </Button>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={pending}
                  onClick={() => onUnpublish(t.code)}
                >
                  {pending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  )}
                  Unpublish
                </Button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                asChild
                disabled={pending}
              >
                <Link href={editorHref}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                  disabled={pending}
                  onClick={() => onDelete(t.code)}
                  title="Delete draft"
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
