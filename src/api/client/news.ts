import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateNewsPostInput,
  DeleteNewsPostInput,
  NewsPost,
  UpdateNewsPostInput,
} from "@/api/contracts/news";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { queryKeys } from "./_query-keys";
import { STALE_TIME } from "@/lib/query-utils";

export function useNews(festivalId: string) {
  return useQuery<NewsPost[]>({
    queryKey: queryKeys.news.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<NewsPost[]>>(
        `/news?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateNews() {
  const qc = useQueryClient();
  return useMutation<NewsPost, Error, { festivalId: string; data: CreateNewsPostInput }>({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<NewsPost>>(
        `/news?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.news.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateNews() {
  const qc = useQueryClient();
  return useMutation<NewsPost, Error, { festivalId: string; postId: string; data: UpdateNewsPostInput }>({
    mutationFn: async ({ festivalId, postId, data }) => {
      const response = await apiClient.put<ApiResponse<NewsPost>>(
        `/news?festivalId=${encodeURIComponent(festivalId)}`,
        { festivalId, postId, data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.news.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteNews() {
  const qc = useQueryClient();
  return useMutation<void, Error, DeleteNewsPostInput>({
    mutationFn: async (data) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/news?festivalId=${encodeURIComponent(data.festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.news.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
