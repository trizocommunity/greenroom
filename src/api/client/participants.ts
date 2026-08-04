import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  BulkCreateParticipantInput,
  CreateParticipantInput,
  ExportExcelResponse,
  Participant,
  UpdateParticipantInput,
  ValidateParticipantsInput,
  ValidateParticipantsResponse,
} from "@/api/contracts/participants";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { queryKeys } from "./_query-keys";

export function useParticipants(festivalId: string) {
  return useQuery<Participant[]>({
    queryKey: queryKeys.participants.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Participant[]>>(
        `/participants?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useParticipant(festivalId: string, participantId: string) {
  return useQuery<Participant>({
    queryKey: queryKeys.participants.detail(festivalId, participantId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Participant>>(
        `/participants/${participantId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId && !!participantId,
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateParticipant() {
  const qc = useQueryClient();
  return useMutation<
    Participant,
    Error,
    { festivalId: string; data: CreateParticipantInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Participant>>(
        `/participants?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.participants.all(festivalId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateParticipant() {
  const qc = useQueryClient();
  return useMutation<
    Participant,
    Error,
    { festivalId: string; participantId: string; data: UpdateParticipantInput }
  >({
    mutationFn: async ({ festivalId, participantId, data }) => {
      const response = await apiClient.put<ApiResponse<Participant>>(
        `/participants/${participantId}?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId, participantId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.participants.detail(festivalId, participantId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.participants.all(festivalId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteParticipant() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { festivalId: string; participantId: string }
  >({
    mutationFn: async ({ festivalId, participantId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/participants/${participantId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId, participantId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.participants.detail(festivalId, participantId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.participants.all(festivalId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useBulkCreateParticipants() {
  const qc = useQueryClient();
  return useMutation<
    Participant[],
    Error,
    { festivalId: string; data: BulkCreateParticipantInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Participant[]>>(
        `/participants/bulk?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.participants.all(festivalId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useExportExcelParticipants() {
  return useMutation<ExportExcelResponse, Error, string>({
    mutationFn: async (festivalId) => {
      const response = await apiClient.get<ApiResponse<ExportExcelResponse>>(
        `/participants/export?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
  });
}

export function useValidateParticipants() {
  return useMutation<
    ValidateParticipantsResponse,
    Error,
    { festivalId: string; data: ValidateParticipantsInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<
        ApiResponse<ValidateParticipantsResponse>
      >(
        `/participants/validate?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
  });
}
