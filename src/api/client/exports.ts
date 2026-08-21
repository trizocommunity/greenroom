import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExportAction,
  deleteExportAction,
  listExportsAction,
} from "@/features/exports/actions/export.actions";
import {
  type ExportTemplateOption,
  listExportTemplatesAction,
} from "@/features/exports/actions/export-template.actions";
import type { ExportConfig } from "@/features/exports/schemas/export-config.schema";
import type {
  ExportFormat,
  ExportListItem,
} from "@/features/exports/types/export.types";
import { toast } from "@/lib/toast";
import { queryKeys } from "./_query-keys";

export function useExportTemplates(
  festivalId: string,
  kind: "BADGE" | "CERTIFICATE",
) {
  return useQuery<ExportTemplateOption[]>({
    queryKey: ["export-templates", festivalId, kind],
    queryFn: async () => {
      const res = await listExportTemplatesAction(festivalId, kind);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!festivalId,
  });
}

export function useExports(festivalId: string) {
  return useQuery<ExportListItem[]>({
    queryKey: queryKeys.exports.all(festivalId),
    queryFn: async () => {
      const res = await listExportsAction(festivalId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!festivalId,
    // Poll while any job is still processing so completed files auto-appear.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((e) => e.status === "PROCESSING")
        ? 2500
        : false,
  });
}

export function useCreateExport() {
  const qc = useQueryClient();
  return useMutation<
    { id: string; status: string },
    Error,
    { festivalId: string; format: ExportFormat; config: ExportConfig }
  >({
    mutationFn: async ({ festivalId, format, config }) => {
      const res = await createExportAction(festivalId, { format, config });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.exports.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteExport() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, { festivalId: string; id: string }>(
    {
      mutationFn: async ({ festivalId, id }) => {
        const res = await deleteExportAction(festivalId, id);
        if (!res.success) throw new Error(res.error);
        return res.data;
      },
      onSuccess: (_data, { festivalId }) => {
        qc.invalidateQueries({ queryKey: queryKeys.exports.all(festivalId) });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useExportBlob({
  exportId,
  format,
  enabled,
}: {
  exportId: string | null;
  format: "PDF" | "CSV";
  enabled: boolean;
}) {
  return useQuery<Blob | null>({
    queryKey: ["export-blob", exportId, format],
    enabled: !!exportId && enabled,
    queryFn: async () => {
      const res = await fetch(`/api/exports/${exportId}/download`);
      if (!res.ok) throw new Error("Failed to fetch export");
      return res.blob();
    },
  });
}
