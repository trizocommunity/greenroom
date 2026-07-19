import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateNewsPostInput,
  DeleteNewsPostInput,
  NewsPost,
  UpdateNewsPostInput,
} from "@/api/contracts/news";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useNews(festivalId: string) {
  return useQuery<NewsPost[]>({
    queryKey: ["news", festivalId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/news?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<NewsPost[]>(res);
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
    { festivalId: string; data: CreateNewsPostInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const res = await fetch(
        `${API_BASE}/news?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<NewsPost>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["news", festivalId] });
    },
  });
}

export function useUpdateNews() {
  const qc = useQueryClient();
  return useMutation<
    NewsPost,
    Error,
    { festivalId: string; postId: string; data: UpdateNewsPostInput }
  >({
    mutationFn: async ({ festivalId, postId, data }) => {
      const res = await fetch(
        `${API_BASE}/news?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ festivalId, postId, data }),
        },
      );
      return handleResponse<NewsPost>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["news", festivalId] });
    },
  });
}

export function useDeleteNews() {
  const qc = useQueryClient();
  return useMutation<void, Error, DeleteNewsPostInput>({
    mutationFn: async (data) => {
      const res = await fetch(
        `${API_BASE}/news?festivalId=${encodeURIComponent(data.festivalId)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      return handleResponse<void>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["news", festivalId] });
    },
  });
}
