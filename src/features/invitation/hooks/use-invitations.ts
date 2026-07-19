import "client-only";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api-client";

export const useCreateInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email: string;
      festivalId: string;
      festivalRole: "ADMIN" | "ANNOUNCER" | "STAGE_MANAGER" | "MEDIA";
    }) => api.invitations.create(data),
    onSuccess: (_data, input) => {
      toast.success("Invitation sent");
      qc.invalidateQueries({ queryKey: ["invitations", input.festivalId] });
    },
    onError: (error: any) => {
      console.error("Create invitation error:", error);
      toast.error(
        error?.body?.error || error?.message || "Failed to send invitation",
      );
    },
  });
};

export const useAcceptInvitation = () => {
  return useMutation({
    mutationFn: (data: { token: string }) => api.invitations.accept(data),
    onSuccess: () => {
      toast.success("Invitation accepted");
    },
    onError: (error: any) => {
      console.error("Accept invitation error:", error);
      toast.error(
        error?.body?.error || error?.message || "Failed to accept invitation",
      );
    },
  });
};

export const usePendingInvitations = (festivalId: string | null) => {
  return useQuery({
    queryKey: ["invitations", festivalId],
    queryFn: () => api.invitations.list(festivalId!),
    enabled: !!festivalId,
  });
};

export const useCancelInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { invitationId: string; festivalId: string }) =>
      api.invitations.cancel(data),
    onSuccess: (_data, input) => {
      toast.success("Invitation cancelled");
      qc.invalidateQueries({ queryKey: ["invitations", input.festivalId] });
    },
    onError: (error: any) => {
      console.error("Cancel invitation error:", error);
      toast.error(
        error?.body?.error || error?.message || "Failed to cancel invitation",
      );
    },
  });
};

export const useInvitationDetails = (token: string | null) => {
  return useQuery({
    queryKey: ["invitation", token],
    queryFn: () => api.invitations.details(token!),
    enabled: !!token,
  });
};
