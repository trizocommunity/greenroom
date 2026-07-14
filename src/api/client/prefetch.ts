import { getQueryClient } from "@/components/providers/QueryProvider";
import { queryKeys } from "./_query-keys";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export async function prefetchFestivals() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.festivals.all,
    queryFn: async () => {
      const res = await fetch("/api/v1/festivals");
      return handleResponse<unknown>(res);
    },
    staleTime: 60 * 1000,
  });
}

export async function prefetchFestival(id: string) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.festivals.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/v1/festivals/${id}`);
      return handleResponse<unknown>(res);
    },
    staleTime: 60 * 1000,
  });
}

export async function prefetchStudents(festivalId: string) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.students.all(festivalId),
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/students?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<unknown>(res);
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
      const res = await fetch(`/api/v1/schedule?${params}`);
      return handleResponse<unknown>(res);
    },
    staleTime: 30 * 1000,
  });
}

export async function prefetchCategories(festivalId: string) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.categories.all(festivalId),
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/categories?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<unknown>(res);
    },
    staleTime: 60 * 1000,
  });
}

export async function prefetchGroups(festivalId: string) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.groups.all(festivalId),
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/groups?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<unknown>(res);
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
      const res = await fetch(`/api/v1/programmes?${params}`);
      return handleResponse<unknown>(res);
    },
    staleTime: 60 * 1000,
  });
}

export async function prefetchJudges(festivalId: string) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.judges.all(festivalId),
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/judges?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<unknown>(res);
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
      const res = await fetch(`/api/v1/results?${params}`);
      return handleResponse<unknown>(res);
    },
    staleTime: 30 * 1000,
  });
}

export async function prefetchMyFestival() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.myFestival.all,
    queryFn: async () => {
      const res = await fetch("/api/v1/my-festival");
      return handleResponse<unknown>(res);
    },
    staleTime: 60 * 1000,
  });
}
