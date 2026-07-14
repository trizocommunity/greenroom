import { useQuery } from "@tanstack/react-query";
import type { UnusedCredit } from "@/api/contracts/billing";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useUnusedCredit() {
  return useQuery<UnusedCredit | null>({
    queryKey: ["billing", "unusedCredit"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/billing`);
      return handleResponse<UnusedCredit | null>(res);
    },
    staleTime: 30 * 1000,
  });
}
