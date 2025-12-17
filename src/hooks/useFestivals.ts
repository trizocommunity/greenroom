import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { festivalApi } from "@/services/festival.api";

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
  return useQuery({
    queryKey: ["festivals"],
    queryFn: festivalApi.getAll,
  });
};

export const useCreateFestival = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: festivalApi.create,
    onSuccess: () => {
      toast.success("Festival created successfully");
      queryClient.invalidateQueries({ queryKey: ["festivals"] });
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
      queryClient.invalidateQueries({ queryKey: ["festivals"] });
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
      queryClient.invalidateQueries({ queryKey: ["festivals"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
