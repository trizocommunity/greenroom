import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/core/http/query-keys";
import {
  createStudentWithServiceAction,
  deleteStudentWithServiceAction,
  getStudentsAction,
  updateStudentAction,
} from "@/features/students/actions/student.actions";

const STALE_TIME_MS = 30 * 1000; // 30 seconds
const GC_TIME_MS = 5 * 60 * 1000; // 5 minutes

export type StudentsListItem = Awaited<
  ReturnType<typeof getStudentsAction>
>[number] & {
  isTeamLeader: boolean;
};

export function useStudents(festivalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.students.list(festivalId),
    queryFn: () => getStudentsAction(festivalId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    enabled: !!festivalId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return createStudentWithServiceAction(festivalId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.list(festivalId),
      });
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.list(festivalId),
      });
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.list(festivalId),
      });
      toast.success("Student deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete student");
    },
  });

  return {
    students: ((query.data ?? []) as Array<{ isTeamLeader?: boolean }>).map(
      (student) => ({
        ...student,
        isTeamLeader: Boolean(student.isTeamLeader),
      }),
    ) as StudentsListItem[],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    createStudent: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateStudent: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteStudent: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
