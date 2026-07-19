import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  Assignment,
  BulkCreateAssignmentInput,
  BulkCreateResult,
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from "@/api/contracts/assignments";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { queryKeys } from "./_query-keys";

export function useAssignments(festivalId: string) {
  return useQuery<Assignment[]>({
    queryKey: queryKeys.assignments.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Assignment[]>>(
        `/assignments?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: 30 * 1000,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation<
    Assignment,
    Error,
    { festivalId: string; data: CreateAssignmentInput },
    { prev: Assignment[] | undefined }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Assignment>>(
        `/assignments?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, data }) => {
      await qc.cancelQueries({
        queryKey: queryKeys.assignments.all(festivalId),
      });
      const prev = qc.getQueryData<Assignment[]>(
        queryKeys.assignments.all(festivalId),
      );
      const tempAssignment: Assignment = {
        id: `temp-${Date.now()}`,
        ...data,
        festivalId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Assignment;
      qc.setQueryData<Assignment[]>(
        queryKeys.assignments.all(festivalId),
        (old) => [...(old || []), tempAssignment],
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      toast.error(_err.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.assignments.all(festivalId), ctx.prev);
      }
    },
    onSuccess: (_data, { festivalId }) => {
      return qc.invalidateQueries({
        queryKey: queryKeys.assignments.all(festivalId),
      });
    },
  });
}

export function useBulkCreateAssignments() {
  const qc = useQueryClient();
  return useMutation<
    BulkCreateResult,
    Error,
    { festivalId: string; data: BulkCreateAssignmentInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<BulkCreateResult>>(
        `/assignments/bulk?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      return qc.invalidateQueries({
        queryKey: queryKeys.assignments.all(festivalId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation<
    Assignment,
    Error,
    { festivalId: string; assignmentId: string; data: UpdateAssignmentInput },
    { prev: Assignment[] | undefined }
  >({
    mutationFn: async ({ festivalId, assignmentId, data }) => {
      const response = await apiClient.put<ApiResponse<Assignment>>(
        `/assignments/${assignmentId}?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, assignmentId, data }) => {
      await qc.cancelQueries({
        queryKey: queryKeys.assignments.all(festivalId),
      });
      const prev = qc.getQueryData<Assignment[]>(
        queryKeys.assignments.all(festivalId),
      );
      qc.setQueryData<Assignment[]>(
        queryKeys.assignments.all(festivalId),
        (old) =>
          (old || []).map((a) =>
            a.id === assignmentId ? { ...a, ...data } : a,
          ),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      toast.error(_err.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.assignments.all(festivalId), ctx.prev);
      }
    },
    onSuccess: (_data, { festivalId }) => {
      return qc.invalidateQueries({
        queryKey: queryKeys.assignments.all(festivalId),
      });
    },
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { festivalId: string; assignmentId: string },
    { prev: Assignment[] | undefined }
  >({
    mutationFn: async ({ festivalId, assignmentId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/assignments?festivalId=${encodeURIComponent(festivalId)}`,
        { data: { assignmentId } },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, assignmentId }) => {
      await qc.cancelQueries({
        queryKey: queryKeys.assignments.all(festivalId),
      });
      const prev = qc.getQueryData<Assignment[]>(
        queryKeys.assignments.all(festivalId),
      );
      qc.setQueryData<Assignment[]>(
        queryKeys.assignments.all(festivalId),
        (old) => (old || []).filter((a) => a.id !== assignmentId),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      toast.error(_err.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.assignments.all(festivalId), ctx.prev);
      }
    },
    onSuccess: (_data, { festivalId }) => {
      return qc.invalidateQueries({
        queryKey: queryKeys.assignments.all(festivalId),
      });
    },
  });
}
