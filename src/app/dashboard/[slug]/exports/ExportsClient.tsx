"use client";

import { FileDown, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useDeleteExport, useExports } from "@/api/client/exports";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExportListItem } from "@/features/exports/types/export.types";
import { toast } from "@/lib/toast";

const ClientTemplateExportRunner = dynamic(
  () =>
    import("./_components/ClientTemplateExportRunner").then(
      (m) => m.ClientTemplateExportRunner,
    ),
  { ssr: false },
);

import { ExportDetailDrawer } from "./_components/ExportDetailDrawer";
import { ExportIssuesBanner } from "./_components/ExportIssuesBanner";
import { ExportsTable } from "./_components/ExportsTable";
import { NewExportDrawer } from "./_components/NewExportDrawer";

interface ExportsClientProps {
  festivalId: string;
  festivalSlug: string;
}

export function ExportsClient({ festivalId }: ExportsClientProps) {
  const { data: exports, isLoading, isError, error } = useExports(festivalId);
  const deleteExport = useDeleteExport();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ExportListItem | null>(null);
  const [exportProgress, setExportProgress] = useState<
    Record<string, { current: number; total: number }>
  >({});

  const handleTemplateProgress = useCallback(
    (id: string, current: number, total: number) => {
      setExportProgress((prev) => ({
        ...prev,
        [id]: { current, total },
      }));
    },
    [],
  );

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await deleteExport.mutateAsync({ festivalId, id: confirmId });
      toast.success("Export deleted.");
      setConfirmId(null);
      if (selectedItem?.id === confirmId) setSelectedItem(null);
    } catch {
      // handled by the hook's onError toast
    }
  };

  return (
    <div className="space-y-6">
      {exports && exports.length > 0 && (
        <ExportIssuesBanner exports={exports} />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Exports
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Files are processed in the background and expire after 1 day. Use
            the download button on a row to save the file.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 sm:mr-2" />
          New Export
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-8 text-destructive">
          Error: {error?.message}
        </div>
      ) : !exports || exports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileDown className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No exports yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Create an export to generate call lists, results, badges and more
              from your festival data.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => setDrawerOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Export
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ExportsTable
          exports={exports}
          progressMap={exportProgress}
          onDelete={(id) => setConfirmId(id)}
          deletingId={deleteExport.isPending ? confirmId : null}
          onRowClick={(item) => setSelectedItem(item)}
        />
      )}

      <DeleteDialog
        title="Delete export"
        description="This removes the file and its history entry. This cannot be undone."
        open={!!confirmId}
        onOpenChange={(open) => !open && setConfirmId(null)}
        onDelete={handleDelete}
        isDeleting={deleteExport.isPending}
      />

      <NewExportDrawer
        festivalId={festivalId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <ExportDetailDrawer
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        item={selectedItem}
      />

      {/* Off-screen Konva renderer for badge/certificate jobs. */}
      <ClientTemplateExportRunner
        festivalId={festivalId}
        exports={exports ?? []}
        onProgress={handleTemplateProgress}
      />
    </div>
  );
}
