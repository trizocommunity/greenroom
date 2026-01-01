import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createStudentWithServiceAction,
  deleteStudentWithServiceAction,
  getStudentsAction,
  updateStudentAction,
} from "@/server/actions/student.actions";

export function useStudents(festivalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["students", festivalId],
    queryFn: () => getStudentsAction(festivalId),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return createStudentWithServiceAction(festivalId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students", festivalId] });
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
      queryClient.invalidateQueries({ queryKey: ["students", festivalId] });
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
      queryClient.invalidateQueries({ queryKey: ["students", festivalId] });
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
