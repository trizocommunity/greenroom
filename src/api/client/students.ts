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
import { queryKeys } from "./_query-keys";
import { STALE_TIME } from "@/lib/query-utils";

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
    staleTime: STALE_TIME.standard,
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
    staleTime: STALE_TIME.standard,
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation<Student, Error, { festivalId: string; data: CreateStudentInput }>({
    mutationFn: async ({ festivalId, data }) => {
      const response = await apiClient.post<ApiResponse<Student>>(
        `/students?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.students.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation<Student, Error, { festivalId: string; studentId: string; data: UpdateStudentInput }>({
    mutationFn: async ({ festivalId, studentId, data }) => {
      const response = await apiClient.put<ApiResponse<Student>>(
        `/students/${studentId}?festivalId=${encodeURIComponent(festivalId)}`,
        { data },
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId, studentId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.students.detail(festivalId, studentId) });
      qc.invalidateQueries({ queryKey: queryKeys.students.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation<void, Error, { festivalId: string; studentId: string }>({
    mutationFn: async ({ festivalId, studentId }) => {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/students/${studentId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleApiResponse(response.data);
    },
    onSuccess: (_data, { festivalId, studentId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.students.detail(festivalId, studentId) });
      qc.invalidateQueries({ queryKey: queryKeys.students.all(festivalId) });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

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
