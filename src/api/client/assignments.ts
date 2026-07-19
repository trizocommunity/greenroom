import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Assignment,
  BulkCreateAssignmentInput,
  BulkCreateResult,
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from "@/api/contracts/assignments";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useAssignments(festivalId: string) {
  return useQuery<Assignment[]>({
    queryKey: ["assignments", festivalId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/assignments?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<Assignment[]>(res);
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
    { festivalId: string; data: CreateAssignmentInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const res = await fetch(
        `${API_BASE}/assignments?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Assignment>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["assignments", festivalId] });
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
      const res = await fetch(
        `${API_BASE}/assignments/bulk?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<BulkCreateResult>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["assignments", festivalId] });
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
      const res = await fetch(
        `${API_BASE}/assignments/${assignmentId}?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Assignment>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["assignments", festivalId] });
    },
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; assignmentId: string }>(
    {
      mutationFn: async ({ festivalId, assignmentId }) => {
        const res = await fetch(
          `${API_BASE}/assignments?festivalId=${encodeURIComponent(festivalId)}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignmentId }),
          },
        );
        return handleResponse<void>(res);
      },
      onSuccess: (_data, { festivalId }) => {
        qc.invalidateQueries({ queryKey: ["assignments", festivalId] });
      },
    },
  );
}
