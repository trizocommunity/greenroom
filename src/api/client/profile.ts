import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { UpdateProfileInput } from "@/api/contracts/profile";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { toast } from "@/lib/toast";
import { queryKeys } from "./_query-keys";

export interface UserWithInstitution {
  id: string;
  email: string;
  fullName: string | null;
  displayName: string | null;
  accountType: "PERSONAL" | "INSTITUTIONAL" | null;
  globalRole: string;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
  institutionId: string | null;
  institution?: {
    id: string;
    name: string;
    type: string;
    affiliation: string | null;
    city: string | null;
    sizeRange: string | null;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export function useProfile() {
  return useQuery<UserWithInstitution>({
    queryKey: queryKeys.profile.all,
    queryFn: async () => {
      const response =
        await apiClient.get<ApiResponse<UserWithInstitution>>("/profile");
      return handleApiResponse(response.data);
    },
    staleTime: STALE_TIME.standard,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation<UserWithInstitution, Error, UpdateProfileInput>({
    mutationFn: async (data) => {
      const response = await apiClient.put<ApiResponse<UserWithInstitution>>(
        "/profile",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export const updateInstitutionInput = z.object({
  institutionName: z.string().min(2).optional(),
  institutionType: z.string().optional(),
  affiliation: z.string().optional(),
  city: z.string().optional(),
  sizeRange: z.string().optional(),
});

export function useUpdateInstitution() {
  const qc = useQueryClient();
  return useMutation<
    UserWithInstitution,
    Error,
    z.infer<typeof updateInstitutionInput>
  >({
    mutationFn: async (data) => {
      const response = await apiClient.put<ApiResponse<UserWithInstitution>>(
        "/profile/institution",
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
