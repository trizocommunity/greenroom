import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateProfileInput } from "@/api/contracts/profile";
import type { SessionPayload } from "@/api/lib/create-handler";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useProfile() {
  return useQuery<SessionPayload>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/profile`);
      return handleResponse<SessionPayload>(res);
    },
    staleTime: 30 * 1000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation<SessionPayload, Error, UpdateProfileInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<SessionPayload>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
