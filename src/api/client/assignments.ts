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
import { STALE_TIME } from "@/lib/query-utils";
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
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation<
    Assignment,
    Error,
    { festivalId: string; data: CreateAssignmentInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Assignment>>(
        `/assignments?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.assignments.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
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
      qc.invalidateQueries({
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
    { festivalId: string; assignmentId: string; data: UpdateAssignmentInput }
  >({
    mutationFn: async ({ festivalId, assignmentId, data }) => {
      const response = await apiClient.put<ApiResponse<Assignment>>(
        `/assignments/${assignmentId}?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.assignments.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    {
      festivalId: string;
      assignmentId: string;
      replacementLeadStudentId?: string;
    }
  >({
    mutationFn: async ({
      festivalId,
      assignmentId,
      replacementLeadStudentId,
    }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/assignments?festivalId=${encodeURIComponent(festivalId)}`,
        { data: { assignmentId, replacementLeadStudentId } },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.assignments.all(festivalId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
