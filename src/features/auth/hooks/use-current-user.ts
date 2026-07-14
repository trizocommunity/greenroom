import "client-only";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const result = await api.auth.me();
      return result.body;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};
