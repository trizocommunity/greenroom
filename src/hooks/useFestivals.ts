import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { festivalApi } from "@/services/festival.api";
import { useCurrentUser } from "./useCurrentUser";

export type Festival = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  startDate: string;
  endDate: string;
  location: string;
  status: "UPCOMING" | "ONGOING" | "COMPLETED";
  createdAt: string;
  orgName: string;
  orgDescription: string | null;
  orgWebsite: string | null;
  orgLocation: string | null;
  orgEstablishedYear: number | null;
};

export type CreateFestivalInput = {
  name: string;
  slug: string;
  description?: string;
  startDate: string;
  endDate: string;
  location: string;
  orgName: string;
  orgDescription?: string;
  orgWebsite?: string;
  orgLocation?: string;
  orgEstablishedYear?: number;
};

export const useFestivals = () => {
  const { data: user } = useCurrentUser();

  return useQuery({
    queryKey: queryKeys.festivals.list(user?.id),
    queryFn: festivalApi.getAll,
    staleTime: 1000 * 60, // 1 minute
    enabled: !!user?.id,
  });
};

export const useCreateFestival = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: festivalApi.create,
    onSuccess: () => {
      toast.success("Festival created successfully");
      // Invalidate both festivals and payments to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.festivals.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

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
    onError: (error) => {
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
      // Invalidate both festivals and payments
      queryClient.invalidateQueries({ queryKey: queryKeys.festivals.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
