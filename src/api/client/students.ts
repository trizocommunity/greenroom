import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  BulkCreateStudentInput,
  CreateStudentInput,
  ExportExcelResponse,
  Student,
  UpdateStudentInput,
  ValidateStudentsInput,
  ValidateStudentsResponse,
} from "@/api/contracts/students";
import type { ApiResponse } from "@/lib/api-client";
import { apiClient, handleApiResponse } from "@/lib/api-client";
import {
  createCreateMutation,
  createDeleteMutation,
  createUpdateMutation,
} from "./_mutation-factory";
import { queryKeys } from "./_query-keys";

export function useStudents(festivalId: string) {
  return useQuery<Student[]>({
    queryKey: queryKeys.students.all(festivalId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Student[]>>(
        `/students?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId,
    staleTime: 30 * 1000,
  });
}

export function useStudent(festivalId: string, studentId: string) {
  return useQuery<Student>({
    queryKey: queryKeys.students.detail(festivalId, studentId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Student>>(
        `/students/${studentId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    enabled: !!festivalId && !!studentId,
    staleTime: 30 * 1000,
  });
}

export const useCreateStudent = createCreateMutation<
  Student,
  { festivalId: string; data: CreateStudentInput }
>({
  getQueryKey: ({ festivalId }) => queryKeys.students.all(festivalId),
  mutationFn: async ({ festivalId, data }) => {
    const response = await apiClient.post<ApiResponse<Student>>(
      `/students?festivalId=${encodeURIComponent(festivalId)}`,
      { data },
    );
    return handleApiResponse(response.data);
  },
  createOptimisticItem: ({ festivalId, data }, tempId) => ({
    id: tempId,
    festivalId,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    groupId: data.groupId,
    categoryId: data.categoryId,
    gender: data.gender ?? "MALE",
    age: data.age ?? null,
    standard: data.standard ?? null,
    chestNumber: null,
    profileSlug: null,
    isTeamLeader: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    group: null,
    category: null,
  }),
});

export const useUpdateStudent = createUpdateMutation<
  Student,
  { festivalId: string; studentId: string; data: UpdateStudentInput }
>({
  getQueryKey: ({ festivalId }) => queryKeys.students.all(festivalId),
  mutationFn: async ({ festivalId, studentId, data }) => {
    const response = await apiClient.put<ApiResponse<Student>>(
      `/students/${studentId}?festivalId=${encodeURIComponent(festivalId)}`,
      { data },
    );
    return handleApiResponse(response.data);
  },
  updateOptimisticItem: (item, { data }) => ({
    ...item,
    ...data,
    updatedAt: new Date().toISOString(),
  }),
  getItemId: (item) => item.id,
});

export const useDeleteStudent = createDeleteMutation<
  Student,
  { festivalId: string; studentId: string }
>({
  getQueryKey: ({ festivalId }) => queryKeys.students.all(festivalId),
  mutationFn: async ({ festivalId, studentId }) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/students/${studentId}?festivalId=${encodeURIComponent(festivalId)}`,
    );
    return handleApiResponse(response.data);
  },
  getItemId: ({ studentId }) => studentId,
});

export function useBulkCreateStudents() {
  const qc = useQueryClient();
  return useMutation<
    Student[],
    Error,
    { festivalId: string; data: BulkCreateStudentInput }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Student[]>>(
        `/students/bulk?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.students.all(festivalId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useExportExcelStudents() {
  return useMutation<ExportExcelResponse, Error, string>({
    mutationFn: async (festivalId) => {
      const response = await apiClient.get<ApiResponse<ExportExcelResponse>>(
        `/students/export?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
  });
}

export function useValidateStudents() {
  return useMutation<ValidateStudentsResponse, Error, ValidateStudentsInput>({
    mutationFn: async (data) => {
      const response = await apiClient.post<
        ApiResponse<ValidateStudentsResponse>
      >("/students/validate", { data });
      return handleApiResponse(response.data);
    },
  });
}
