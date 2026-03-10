import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import {
  createStudentWithServiceAction,
  deleteStudentWithServiceAction,
  getStudentsAction,
  updateStudentAction,
} from "@/server/actions/student.actions";

const STALE_TIME_MS = 2 * 60 * 1000; // 2 minutes
const GC_TIME_MS = 5 * 60 * 1000; // 5 minutes

export function useStudents(festivalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.students.list(festivalId),
    queryFn: () => getStudentsAction(festivalId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    enabled: !!festivalId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return createStudentWithServiceAction(festivalId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.list(festivalId) });
      toast.success("Student created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create student");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return updateStudentAction(festivalId, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.list(festivalId) });
      toast.success("Student updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update student");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteStudentWithServiceAction(festivalId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.list(festivalId) });
      toast.success("Student deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete student");
    },
  });

  return {
    students: query.data || [],
    isLoading: query.isLoading,
    createStudent: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateStudent: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteStudent: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
