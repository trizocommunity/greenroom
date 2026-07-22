import "client-only";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        const result = await api.auth.me();
        return result.body;
      } catch (error: unknown) {
        if ((error as { status?: number })?.status === 401) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};
