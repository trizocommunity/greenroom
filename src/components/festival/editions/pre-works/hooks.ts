"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner"; // Assuming sonner or similar

// -----------------------------------------------------------------------------
// CATEGORIES
// -----------------------------------------------------------------------------

export function useCategories(editionId: string) {
  return useQuery({
    queryKey: ["categories", editionId],
    queryFn: async () => {
      const res = await fetch(`/api/editions/${editionId}/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
    enabled: !!editionId,
  });
}

export function useCreateCategory(editionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await fetch(`/api/editions/${editionId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", editionId] });
      toast.success("Category created");
    },
    onError: (err) => toast.error(err.message),
  });
}

// -----------------------------------------------------------------------------

export function useUpdateCategory(editionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string };
    }) => {
      const res = await fetch(`/api/editions/${editionId}/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", editionId] });
      toast.success("Category updated");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteCategory(editionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/editions/${editionId}/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", editionId] });
      toast.success("Category deleted");
    },
    onError: (err) => toast.error(err.message),
  });
}

// -----------------------------------------------------------------------------
// PROGRAMMES
// -----------------------------------------------------------------------------

export function useProgrammes(editionId: string, categoryId?: string) {
  return useQuery({
    queryKey: ["programmes", editionId, categoryId],
    queryFn: async () => {
      const params = categoryId ? `?categoryId=${categoryId}` : "";
      const res = await fetch(`/api/editions/${editionId}/programmes${params}`);
      if (!res.ok) throw new Error("Failed to fetch programmes");
      return res.json();
    },
    enabled: !!editionId,
  });
}

export function useCreateProgramme(editionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/editions/${editionId}/programmes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create programme");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["programmes", editionId] });
      toast.success("Programme created");
    },
    onError: (err) => toast.error(err.message),
  });
}

// -----------------------------------------------------------------------------

export function useUpdateProgramme(editionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/editions/${editionId}/programmes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update programme");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programmes", editionId] });
      toast.success("Programme updated");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteProgramme(editionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/editions/${editionId}/programmes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programmes", editionId] });
      toast.success("Programme deleted");
    },
    onError: (err) => toast.error(err.message),
  });
}

// -----------------------------------------------------------------------------
// GROUPS
// -----------------------------------------------------------------------------

export function useGroups(editionId: string) {
  return useQuery({
    queryKey: ["groups", editionId],
    queryFn: async () => {
      const res = await fetch(`/api/editions/${editionId}/groups`);
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
    enabled: !!editionId,
  });
}

export function useCreateGroup(editionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/editions/${editionId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create group");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", editionId] });
      toast.success("Group created");
    },
    onError: (err) => toast.error(err.message),
  });
}

// -----------------------------------------------------------------------------

export function useUpdateGroup(editionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/editions/${editionId}/groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update group");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", editionId] });
      toast.success("Group updated");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteGroup(editionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/editions/${editionId}/groups/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", editionId] });
      toast.success("Group deleted");
    },
    onError: (err) => toast.error(err.message),
  });
}

// -----------------------------------------------------------------------------
// PARTICIPANTS
// -----------------------------------------------------------------------------

export function useParticipants(editionId: string, groupId?: string) {
  return useQuery({
    queryKey: ["participants", editionId, groupId],
    queryFn: async () => {
      const params = groupId ? `?groupId=${groupId}` : "";
      const res = await fetch(
        `/api/editions/${editionId}/participants${params}`,
      );
      if (!res.ok) throw new Error("Failed to fetch participants");
      return res.json();
    },
    enabled: !!editionId,
  });
}

export function useCreateParticipant(editionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/editions/${editionId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create participant");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", editionId] });
      // Also might affect groups count or usage
      queryClient.invalidateQueries({ queryKey: ["groups", editionId] });
      toast.success("Participant added");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteParticipant(editionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/editions/${editionId}/participants/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", editionId] });
      toast.success("Participant removed");
    },
    onError: (err) => toast.error(err.message),
  });
}

// -----------------------------------------------------------------------------
// ASSIGNMENTS
// -----------------------------------------------------------------------------

export function useAssignments(editionId: string, programmeId?: string) {
  return useQuery({
    queryKey: ["assignments", editionId, programmeId],
    queryFn: async () => {
      if (!programmeId) return [];
      const res = await fetch(
        `/api/editions/${editionId}/assignments?programmeId=${programmeId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
    enabled: !!editionId && !!programmeId,
  });
}

export function useCreateAssignment(editionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/editions/${editionId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to assign");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["assignments", editionId, variables.programmeId],
      });
      queryClient.invalidateQueries({ queryKey: ["programmes", editionId] }); // Update counts
      toast.success("Assigned successfully");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteAssignment(editionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/editions/${editionId}/assignments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to remove");
      }
    },
    onSuccess: () => {
      // Invalidate broader key or need programmeId to be specific
      // Often simpler to just invalidate all assignments for edition or rely on specific usage
      queryClient.invalidateQueries({ queryKey: ["assignments", editionId] });
      queryClient.invalidateQueries({ queryKey: ["programmes", editionId] });
      toast.success("Removed assignment");
    },
    onError: (err) => toast.error(err.message),
  });
}
