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
    staleTime: 30 * 1000,
  });
}

export function useCreateNews() {
  const qc = useQueryClient();
  return useMutation<
    NewsPost,
    Error,
    { festivalId: string; data: CreateNewsPostInput },
    { prev: NewsPost[] | undefined }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<NewsPost>>(
        `/news?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, data }) => {
      await qc.cancelQueries({ queryKey: queryKeys.news.all(festivalId) });
      const prev = qc.getQueryData<NewsPost[]>(queryKeys.news.all(festivalId));
      const tempPost: NewsPost = {
        id: `temp-${Date.now()}`,
        ...data,
        festivalId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as NewsPost;
      qc.setQueryData<NewsPost[]>(queryKeys.news.all(festivalId), (old) => [
        ...(old || []),
        tempPost,
      ]);
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      toast.error(_err.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.news.all(festivalId), ctx.prev);
      }
    },
    onSuccess: (_data, { festivalId }) => {
      return qc.invalidateQueries({ queryKey: queryKeys.news.all(festivalId) });
    },
  });
}

export function useUpdateNews() {
  const qc = useQueryClient();
  return useMutation<
    NewsPost,
    Error,
    { festivalId: string; postId: string; data: UpdateNewsPostInput },
    { prev: NewsPost[] | undefined }
  >({
    mutationFn: async ({ festivalId, postId, data }) => {
      const response = await apiClient.put<ApiResponse<NewsPost>>(
        `/news?festivalId=${encodeURIComponent(festivalId)}`,
        { festivalId, postId, data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, postId, data }) => {
      await qc.cancelQueries({ queryKey: queryKeys.news.all(festivalId) });
      const prev = qc.getQueryData<NewsPost[]>(queryKeys.news.all(festivalId));
      qc.setQueryData<NewsPost[]>(queryKeys.news.all(festivalId), (old) =>
        (old || []).map((p) => (p.id === postId ? { ...p, ...data } : p)),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      toast.error(_err.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.news.all(festivalId), ctx.prev);
      }
    },
    onSuccess: (_data, { festivalId }) => {
      return qc.invalidateQueries({ queryKey: queryKeys.news.all(festivalId) });
    },
  });
}

export function useDeleteNews() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    DeleteNewsPostInput,
    { prev: NewsPost[] | undefined }
  >({
    mutationFn: async (data) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/news?festivalId=${encodeURIComponent(data.festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onMutate: async ({ festivalId, postId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.news.all(festivalId) });
      const prev = qc.getQueryData<NewsPost[]>(queryKeys.news.all(festivalId));
      qc.setQueryData<NewsPost[]>(queryKeys.news.all(festivalId), (old) =>
        (old || []).filter((p) => p.id !== postId),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      toast.error(_err.message);
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.news.all(festivalId), ctx.prev);
      }
    },
    onSuccess: (_data, { festivalId }) => {
      return qc.invalidateQueries({ queryKey: queryKeys.news.all(festivalId) });
    },
  });
}
