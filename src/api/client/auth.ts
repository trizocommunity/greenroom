import { useMutation, useQuery } from "@tanstack/react-query";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useLogout() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/auth?action=logout`, {
        method: "POST",
      });
      return handleResponse<void>(res);
    },
  });
}
