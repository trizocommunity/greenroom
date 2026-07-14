import { useQuery } from "@tanstack/react-query";
import type { MyFestivalResponse, JoinedFestival } from "@/api/contracts/my-festival";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useMyFestivals() {
  return useQuery<MyFestivalResponse>({
    queryKey: ["my-festival"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/my-festival`);
      return handleResponse<MyFestivalResponse>(res);
    },
    staleTime: 30 * 1000,
  });
}

export function useJoinedFestivals() {
  return useQuery<JoinedFestival[]>({
    queryKey: ["my-festival", "joined"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/my-festival`);
      const data = await handleResponse<MyFestivalResponse>(res);
      if (!data.festival) return [];
      return [
        {
          ...data.festival,
          memberRole: "OWNER" as const,
          memberSince: data.festival.createdAt,
        },
      ];
    },
    staleTime: 30 * 1000,
  });
}
