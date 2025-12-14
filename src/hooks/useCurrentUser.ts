import { useQuery } from "@tanstack/react-query";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  displayName: string | null;
  globalRole: "USER" | "SUPER_ADMIN";
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async (): Promise<CurrentUser> => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        throw new Error("Failed to fetch current user");
      }
      return response.json();
    },
  });
};
