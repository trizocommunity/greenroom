"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import {
  createAssignmentAction,
  deleteAssignmentAction,
  getAssignmentsAction,
} from "@/server/actions/assignment.actions";
import {
  createCategoryAction,
  deleteCategoryAction,
  getCategoriesAction,
} from "@/server/actions/category.actions";
import {
  createGroupAction,
  deleteGroupAction,
  getGroupsAction,
} from "@/server/actions/group.actions";
import {
  createStudentWithServiceAction,
  deleteStudentWithServiceAction,
  getStudentsAction,
} from "@/server/actions/student.actions";
import {
  createProgrammeAction,
  deleteProgrammeAction,
  getProgrammesAction,
} from "@/server/actions/programme.actions";

// ============================================================================
// Categories Hooks
// ============================================================================

export function useCategories(festivalId: string) {
  return useQuery({
    queryKey: queryKeys.categories.list(festivalId),
    queryFn: () => getCategoriesAction(festivalId),
    enabled: !!festivalId,
  });
}

export function useCreateCategory(festivalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      createCategoryAction(festivalId, data),
    onSuccess: () => {
      toast.success("Category created successfully");
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories.list(festivalId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create category");
    },
  });
}

export function useDeleteCategory(festivalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategoryAction(festivalId, id),
    onSuccess: () => {
      toast.success("Category deleted");
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories.list(festivalId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete category");
    },
  });
}

// ============================================================================
// Groups Hooks
// ============================================================================

export function useGroups(festivalId: string) {
  return useQuery({
    queryKey: queryKeys.groups.list(festivalId),
    queryFn: () => getGroupsAction(festivalId),
    enabled: !!festivalId,
  });
}

export function useCreateGroup(festivalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type?: string }) =>
      createGroupAction(festivalId, data),
    onSuccess: () => {
      toast.success("Group created successfully");
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.list(festivalId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create group");
    },
  });
}

export function useDeleteGroup(festivalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGroupAction(festivalId, id),
    onSuccess: () => {
      toast.success("Group deleted");
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.list(festivalId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete group");
    },
  });
}

// ============================================================================
// Programmes Hooks
// ============================================================================

export function useProgrammes(festivalId: string) {
  return useQuery({
    queryKey: queryKeys.programmes.list(festivalId),
    queryFn: () => getProgrammesAction(festivalId),
    enabled: !!festivalId,
  });
}

export function useCreateProgramme(festivalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      categoryId: string;
      type?: string;
      stageType?: string;
      maxEntries?: number;
    }) => createProgrammeAction(festivalId, data),
    onSuccess: () => {
      toast.success("Programme created successfully");
      queryClient.invalidateQueries({
        queryKey: queryKeys.programmes.list(festivalId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create programme");
    },
  });
}

export function useDeleteProgramme(festivalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProgrammeAction(festivalId, id),
    onSuccess: () => {
      toast.success("Programme deleted");
      queryClient.invalidateQueries({
        queryKey: queryKeys.programmes.list(festivalId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete programme");
    },
  });
}

// ============================================================================
// Students Hooks
// ============================================================================

export function useStudents(festivalId: string) {
  return useQuery({
    queryKey: queryKeys.students.list(festivalId),
    queryFn: () => getStudentsAction(festivalId),
    enabled: !!festivalId,
  });
}

export function useCreateStudent(festivalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      groupId: string;
      categoryId: string;
      email?: string;
      phone?: string;
      gender?: string;
      registrationNumber?: string;
    }) => createStudentWithServiceAction(festivalId, data),
    onSuccess: () => {
      toast.success("Student created successfully");
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.list(festivalId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create student");
    },
  });
}

export function useDeleteStudent(festivalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStudentWithServiceAction(festivalId, id),
    onSuccess: () => {
      toast.success("Student deleted");
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.list(festivalId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete student");
    },
  });
}

// ============================================================================
// Assignments Hooks
// ============================================================================

export function useAssignments(festivalId: string) {
  return useQuery({
    queryKey: queryKeys.assignments.list(festivalId),
    queryFn: () => getAssignmentsAction(festivalId),
    enabled: !!festivalId,
  });
}

export function useCreateAssignment(festivalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      programmeId: string;
      studentId?: string;
      groupId?: string;
    }) => createAssignmentAction(festivalId, data),
    onSuccess: () => {
      toast.success("Assignment created successfully");
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.list(festivalId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create assignment");
    },
  });
}

export function useDeleteAssignment(festivalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAssignmentAction(festivalId, id),
    onSuccess: () => {
      toast.success("Assignment deleted");
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.list(festivalId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete assignment");
    },
  });
}
