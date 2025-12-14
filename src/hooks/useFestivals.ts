import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type Festival = {
  id: string;
  name: string;
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
    queryFn: async (): Promise<Festival[]> => {
      const response = await fetch("/api/festivals");
      if (!response.ok) {
        throw new Error("Failed to fetch festivals");
      }
      return response.json();
    },
    
  });
};

export const useCreateFestival = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFestivalInput) => {
      const response = await fetch("/api/festivals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to create festival");
      }

      return response.json();
    },
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
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateFestivalInput>;
    }) => {
      const response = await fetch(`/api/festivals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to update festival");
      }

      return response.json();
    },
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
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/festivals/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to delete festival");
      }
    },
    onSuccess: () => {
      toast.success("Festival deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["festivals"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
