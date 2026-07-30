import { getQueryClient } from "@/components/providers/QueryProvider";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import { queryKeys } from "./_query-keys";

export async function prefetchFestivals() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.festivals.all,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<unknown>>("/festivals");
      return handleApiResponse(response.data);
    },
    staleTime: 60 * 1000,
  });
}

export async function prefetchFestival(id: string) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.festivals.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<unknown>>(
        `/festivals/${id}`,
      );
      return handleApiResponse(response.data);
    },
    staleTime: 60 * 1000,
  });
}

export async function prefetchParticipants(festivalId: string) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.participants.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<unknown>>(
        `/participants?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    staleTime: 30 * 1000,
  });
}

export async function prefetchSchedule(
  festivalId: string,
  typeFilter?: string,
) {
  const queryClient = getQueryClient();
  const params = new URLSearchParams({ festivalId });
  if (typeFilter) params.set("typeFilter", typeFilter);
  await queryClient.prefetchQuery({
    queryKey: queryKeys.schedule.all(festivalId, typeFilter),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<unknown>>(
        `/schedule?${params}`,
      );
      return handleApiResponse(response.data);
    },
    staleTime: 30 * 1000,
  });
}

export async function prefetchCategories(festivalId: string) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.categories.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<unknown>>(
        `/categories?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    staleTime: 60 * 1000,
  });
}

export async function prefetchGroups(festivalId: string) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.groups.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<unknown>>(
        `/groups?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    staleTime: 60 * 1000,
  });
}

export async function prefetchProgrammes(
  festivalId: string,
  categoryId?: string,
) {
  const queryClient = getQueryClient();
  const params = new URLSearchParams({ festivalId });
  if (categoryId) params.set("categoryId", categoryId);
  await queryClient.prefetchQuery({
    queryKey: queryKeys.programmes.all(festivalId, categoryId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<unknown>>(
        `/programmes?${params}`,
      );
      return handleApiResponse(response.data);
    },
    staleTime: 60 * 1000,
  });
}

export async function prefetchJudges(festivalId: string) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.judges.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<unknown>>(
        `/judges?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    staleTime: 60 * 1000,
  });
}

export async function prefetchResults(
  festivalId: string,
  programmeId?: string,
) {
  const queryClient = getQueryClient();
  const params = new URLSearchParams({ festivalId });
  if (programmeId) params.set("programmeId", programmeId);
  await queryClient.prefetchQuery({
    queryKey: queryKeys.results.all(festivalId, programmeId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<unknown>>(
        `/results?${params}`,
      );
      return handleApiResponse(response.data);
    },
    staleTime: 30 * 1000,
  });
}

export async function prefetchMyFestival() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.myFestival.all,
    queryFn: async () => {
      const response =
        await apiClient.get<ApiResponse<unknown>>("/my-festival");
      return handleApiResponse(response.data);
    },
    staleTime: 60 * 1000,
  });
}
