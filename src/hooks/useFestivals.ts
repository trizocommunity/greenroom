import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { festivalApi } from "@/services/festival.api";
import { useCurrentUser } from "./useCurrentUser";

export type Festival = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  orgName?: string;
  orgDescription?: string;
  orgWebsite?: string;
  orgLocation?: string;
  establishedYear?: number;
  founderName?: string;
  founderMessage?: string;
  status: "DRAFT" | "ACTIVE" | "EXPIRED";
  isLocked: boolean;
  createdAt: string;
  expiresAt?: string | null;
  tier?: string;
  tierLabel?: string;
  participantsCount?: number;
  eventsCount?: number;
  judgesCount?: number;
  storageUsedMB?: number;
};

export type CreateFestivalInput = {
  name: string;
  slug?: string;
  description?: string;
  orgName?: string;
  orgDescription?: string;
  orgWebsite?: string;
  orgLocation?: string;
  establishedYear?: number;
  founderName?: string;
  founderMessage?: string;
};

// Phase 1: Fetch My Festival
export const useMyFestival = () => {
  const { data: user } = useCurrentUser();

  return useQuery({
    queryKey: queryKeys.festivals.list({ userId: user?.id }), // keeping key for now or change to ['my-festival']?
    // Let's use a specific key for my festival
    queryFn: festivalApi.getMyFestival,
    staleTime: 1000 * 60,
    enabled: !!user?.id,
  });
};

export const useFestivals = () => {
  return useQuery({
    queryKey: queryKeys.festivals.all(),
    queryFn: festivalApi.getAll,
  });
};

export const useCreateFestival = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: festivalApi.create,
    onSuccess: () => {
      toast.success("Festival created successfully");
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.festivals.all() });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error.message);
    },
  });
};

// Temporarily Disable or Simplified Update/Delete for Phase 1
// Users generally won't update festival in Phase 1 except maybe slug/name?
// Schema says Locked. So update might be restricted.
// But we keep the hook structure for future phases or admins.

export const useUpdateFestival = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateFestivalInput>;
    }) => festivalApi.update(id, data),
    onSuccess: () => {
      toast.success("Festival updated successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.festivals.all() });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteFestival = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: festivalApi.delete,
    onSuccess: () => {
      toast.success("Festival deleted successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.festivals.all() });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
};

// Removed useDeleteFestival as users cannot delete festivals.
