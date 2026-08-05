"use client";

import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { PosterExportCanvas } from "@/components/festival/posters/PosterExportCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/core/utils/cn";
import {
  deletePosterTemplateDraftAction,
  listPosterTemplatesAction,
  unpublishPosterTemplateAction,
} from "@/features/posters/actions/poster-template.actions";
import type { PosterTemplateRecord } from "@/features/posters/types/poster-template.types";
import { festivalEditorPath } from "@/features/posters/utils/poster-routes";
import { toast } from "@/lib/toast";

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
  status: PosterTemplateRecord["status"];
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

function sortTemplates(items: PosterTemplateRecord[]) {
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
  initialTemplates: PosterTemplateRecord[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [previewTemplate, setPreviewTemplate] =
    useState<PosterTemplateRecord | null>(null);
  const [pending, startTransition] = useTransition();

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
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-semibold">Templates</h2>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="px-3 sm:px-4">
            <Link href={festivalEditorPath(festivalSlug)}>
              <Pencil className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Open editor</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex overflow-x-auto snap-x gap-4 pb-4 px-1">
        {!readOnly && (
          <div className="snap-start w-72 shrink-0">
            <Card className="h-full border-dashed hover:border-primary/50 hover:bg-muted/50 transition-colors group overflow-hidden">
              <Link
                href={festivalEditorPath(festivalSlug)}
                className="flex flex-col items-center justify-center w-full h-full gap-3 p-6 text-center outline-none"
              >
                <div className="rounded-full bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <div className="font-medium">New Template</div>
                  <div className="text-xs text-muted-foreground">
                    Open editor to design a new layout
                  </div>
                </div>
              </Link>
            </Card>
          </div>
        )}
        {sorted.map((t) => (
          <div key={t.id} className="snap-start w-72 shrink-0">
            <TemplateCard
              template={t}
              festivalSlug={festivalSlug}
              readOnly={readOnly}
              pending={pending}
              onUnpublish={handleUnpublish}
              onDelete={handleDelete}
              onPreview={setPreviewTemplate}
            />
          </div>
        ))}
        {sorted.length === 0 && readOnly && (
          <div className="w-full text-center p-8 text-sm text-muted-foreground border border-dashed rounded-xl">
            No templates available.
          </div>
        )}
      </div>

      <Drawer
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Template Preview</DrawerTitle>
            <DrawerDescription>
              Preview and details of this template.
            </DrawerDescription>
          </DrawerHeader>
          {previewTemplate && (
            <div className="py-4 space-y-6 px-4 max-h-[70vh] overflow-y-auto">
              <div className="w-full flex justify-center bg-black/5 rounded-md p-4">
                <PosterExportCanvas
                  doc={previewTemplate.konvaJson}
                  bindings={{}}
                  inline
                  scale={250 / previewTemplate.height}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                <div className="font-medium text-muted-foreground">Type:</div>
                <div className="font-medium">
                  {TYPE_LABELS[previewTemplate.type] ?? previewTemplate.type}
                </div>

                <div className="font-medium text-muted-foreground">Code:</div>
                <div className="font-mono font-medium">
                  {previewTemplate.code}
                </div>

                <div className="font-medium text-muted-foreground">Size:</div>
                <div className="font-medium">
                  {previewTemplate.width} × {previewTemplate.height} px
                </div>

                <div className="font-medium text-muted-foreground">
                  Updated:
                </div>
                <div className="font-medium">
                  {formatUpdatedAt(previewTemplate.updatedAt)}
                </div>
              </div>
            </div>
          )}
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
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
  onPreview,
}: {
  template: PosterTemplateRecord;
  festivalSlug: string;
  readOnly?: boolean;
  pending?: boolean;
  onUnpublish: (code: string) => void;
  onDelete: (code: string) => void;
  onPreview: (t: PosterTemplateRecord) => void;
}) {
  const isPublished = t.status === "PUBLISHED";
  const editorHref = festivalEditorPath(festivalSlug, t.code);
  const typeLabel = TYPE_LABELS[t.type] ?? t.type;

  return (
    <Card
      className={cn(
        "group relative flex flex-col h-full overflow-hidden rounded-xl border pl-3.5 transition-all hover:shadow-md",
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

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-mono text-base leading-snug tracking-tight">
            {t.code}
          </CardTitle>
          <TemplateStatusBadge status={t.status} />
        </div>
        <p className="text-xs text-muted-foreground">{typeLabel}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pb-4 pt-0">
        <div className="flex items-center py-3 border-t border-border/60 justify-between gap-2 text-xs text-muted-foreground">
          {/* <span className="font-mono tabular-nums">
            {t.width} × {t.height} px
          </span> */}
          {isPublished && (
            <p className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Live
            </p>
          )}
          <span>Updated {formatUpdatedAt(t.updatedAt)}</span>
        </div>

        <div className="mt-auto pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={pending}
              onClick={() => onPreview(t)}
            >
              <Eye className="mr-2 h-3.5 w-3.5" />
              Preview
            </Button>
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
                onClick={() =>
                  isPublished ? onUnpublish(t.code) : onDelete(t.code)
                }
                title={isPublished ? "Unpublish" : "Delete draft"}
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isPublished ? (
                  <RotateCcw className="h-3.5 w-3.5" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
