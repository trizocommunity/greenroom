import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { PaginatedResponse } from "@/api/contracts/_shared";
import type {
  CreateProgrammeInput,
  Programme,
  UpdateProgrammeInput,
} from "@/api/contracts/programmes";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { STALE_TIME } from "@/lib/query-utils";
import { toast } from "@/lib/toast";
import { queryKeys } from "./_query-keys";

export function useProgrammes(festivalId: string, categoryId?: string) {
  return useQuery<Programme[]>({
    queryKey: queryKeys.programmes.all(festivalId, categoryId),
    queryFn: async () => {
      const params = new URLSearchParams({ festivalId });
      if (categoryId) params.set("categoryId", categoryId);
      const response = await apiClient.get<ApiResponse<Programme[]>>(
        `/programmes?${params}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: STALE_TIME.standard,
  });
}

export function useProgrammesPaginated(
  festivalId: string,
  params: {
    page: number;
    pageSize: number;
    categoryId?: string;
    search?: string;
    type?: string;
    stageType?: string;
    status?: string;
  },
) {
  return useQuery<PaginatedResponse<Programme>>({
    queryKey: queryKeys.programmes.paginated(festivalId, params),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        festivalId,
        page: params.page.toString(),
        pageSize: params.pageSize.toString(),
      });
      if (params.categoryId) searchParams.set("categoryId", params.categoryId);
      if (params.search) searchParams.set("search", params.search);
      if (params.type) searchParams.set("type", params.type);
      if (params.stageType) searchParams.set("stageType", params.stageType);
      if (params.status) searchParams.set("status", params.status);

      const response = await apiClient.get<
        ApiResponse<PaginatedResponse<Programme>>
      >(`/programmes?${searchParams}`);
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.standard,
  });
}

export function useProgramme(festivalId: string, programmeId: string) {
  return useQuery<Programme>({
    queryKey: queryKeys.programmes.detail(festivalId, programmeId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Programme>>(
        `/programmes/${programmeId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId && !!programmeId,
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateProgramme() {
  const qc = useQueryClient();
  return useMutation<
    Programme,
    Error,
    { festivalId: string; data: CreateProgrammeInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Programme>>(
        `/programmes?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.programmes.byFestival(festivalId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateProgramme() {
  const qc = useQueryClient();
  return useMutation<
    Programme,
    Error,
    { festivalId: string; programmeId: string; data: UpdateProgrammeInput }
  >({
    mutationFn: async ({ festivalId, programmeId, data }) => {
      const response = await apiClient.put<ApiResponse<Programme>>(
        `/programmes/${programmeId}?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId, programmeId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.programmes.detail(festivalId, programmeId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.programmes.byFestival(festivalId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteProgramme() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; programmeId: string }>({
    mutationFn: async ({ festivalId, programmeId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/programmes/${programmeId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId, programmeId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.programmes.detail(festivalId, programmeId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.programmes.byFestival(festivalId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
