import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { UpdateProfileInput } from "@/api/contracts/profile";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

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
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/profile`);
      return handleResponse<UserWithInstitution>(res);
    },
    staleTime: 30 * 1000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation<UserWithInstitution, Error, UpdateProfileInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<UserWithInstitution>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
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
      const res = await fetch(`${API_BASE}/profile/institution`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<UserWithInstitution>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
