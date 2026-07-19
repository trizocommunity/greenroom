import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BulkCreateStudentInput,
  CreateStudentInput,
  ExportExcelResponse,
  Student,
  UpdateStudentInput,
  ValidateStudentsInput,
  ValidateStudentsResponse,
} from "@/api/contracts/students";

const API_BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

export function useStudents(festivalId: string) {
  return useQuery<Student[]>({
    queryKey: ["students", festivalId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/students?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<Student[]>(res);
    },
    enabled: !!festivalId,
    staleTime: 30 * 1000,
  });
}

export function useStudent(festivalId: string, studentId: string) {
  return useQuery<Student>({
    queryKey: ["students", festivalId, studentId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/students/${studentId}?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<Student>(res);
    },
    enabled: !!festivalId && !!studentId,
    staleTime: 30 * 1000,
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation<
    Student,
    Error,
    { festivalId: string; data: CreateStudentInput },
    { prev: Student[] | undefined }
  >({
    mutationFn: async ({ festivalId, data }) => {
      const res = await fetch(
        `${API_BASE}/students?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Student>(res);
    },
    onMutate: async ({ festivalId, data }) => {
      await qc.cancelQueries({ queryKey: ["students", festivalId] });
      const prev = qc.getQueryData<Student[]>(["students", festivalId]);
      const tempId = `temp-${Date.now()}`;
      const optimisticStudent: Student = {
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
      };
      qc.setQueryData<Student[]>(["students", festivalId], (old) =>
        old ? [...old, optimisticStudent] : [optimisticStudent],
      );
      return { prev };
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["students", festivalId] });
      qc.invalidateQueries({ queryKey: ["assignments", festivalId] });
      qc.invalidateQueries({ queryKey: ["groups", festivalId] });
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["students", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["students", festivalId] });
      qc.invalidateQueries({ queryKey: ["assignments", festivalId] });
      qc.invalidateQueries({ queryKey: ["groups", festivalId] });
    },
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation<
    Student,
    Error,
    { festivalId: string; studentId: string; data: UpdateStudentInput },
    { prev: Student[] | undefined }
  >({
    mutationFn: async ({ festivalId, studentId, data }) => {
      const res = await fetch(
        `${API_BASE}/students/${studentId}?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Student>(res);
    },
    onMutate: async ({ festivalId, studentId, data }) => {
      await qc.cancelQueries({ queryKey: ["students", festivalId] });
      const prev = qc.getQueryData<Student[]>(["students", festivalId]);
      qc.setQueryData<Student[]>(["students", festivalId], (old) =>
        old?.map((s) =>
          s.id === studentId
            ? {
                ...s,
                ...data,
                updatedAt: new Date().toISOString(),
              }
            : s,
        ),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["students", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["students", festivalId] });
      qc.invalidateQueries({ queryKey: ["groups", festivalId] });
      qc.invalidateQueries({ queryKey: ["assignments", festivalId] });
    },
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { festivalId: string; studentId: string },
    { prev: Student[] | undefined }
  >({
    mutationFn: async ({ festivalId, studentId }) => {
      const res = await fetch(
        `${API_BASE}/students/${studentId}?festivalId=${encodeURIComponent(festivalId)}`,
        { method: "DELETE" },
      );
      return handleResponse<void>(res);
    },
    onMutate: async ({ festivalId, studentId }) => {
      await qc.cancelQueries({ queryKey: ["students", festivalId] });
      const prev = qc.getQueryData<Student[]>(["students", festivalId]);
      qc.setQueryData(["students", festivalId], (old: Student[] | undefined) =>
        old?.filter((s) => s.id !== studentId),
      );
      return { prev };
    },
    onError: (_err, { festivalId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["students", festivalId], ctx.prev);
      }
    },
    onSettled: (_data, _err, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["students", festivalId] });
      qc.invalidateQueries({ queryKey: ["assignments", festivalId] });
      qc.invalidateQueries({ queryKey: ["groups", festivalId] });
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
      const res = await fetch(
        `${API_BASE}/students/bulk?festivalId=${encodeURIComponent(festivalId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        },
      );
      return handleResponse<Student[]>(res);
    },
    onSuccess: (_data, { festivalId }) => {
      qc.invalidateQueries({ queryKey: ["students", festivalId] });
      qc.invalidateQueries({ queryKey: ["assignments", festivalId] });
      qc.invalidateQueries({ queryKey: ["groups", festivalId] });
    },
  });
}

export function useExportExcelStudents() {
  return useMutation<ExportExcelResponse, Error, string>({
    mutationFn: async (festivalId) => {
      const res = await fetch(
        `${API_BASE}/students/export?festivalId=${encodeURIComponent(festivalId)}`,
      );
      return handleResponse<ExportExcelResponse>(res);
    },
  });
}

export function useValidateStudents() {
  return useMutation<ValidateStudentsResponse, Error, ValidateStudentsInput>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/students/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return handleResponse<ValidateStudentsResponse>(res);
    },
  });
}
