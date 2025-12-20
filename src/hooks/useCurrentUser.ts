import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import api from "@/lib/axios";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  displayName: string | null;
  globalRole: "USER" | "SUPER_ADMIN";
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: queryKeys.auth.currentUser(),
    queryFn: async (): Promise<CurrentUser> => {
      const { data } = await api.get<CurrentUser>("/auth/me");
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
};
