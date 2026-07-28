import "client-only";

import {
  QueryClientContext,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { useContext } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getPostAuthRoute } from "@/core/auth/routing";
import { api } from "@/lib/api-client";

function useQueryClientSafe() {
  const queryClient = useContext(QueryClientContext);
  return queryClient ?? null;
}

export const useSendMagicLink = () => {
  return useMutation({
    mutationFn: (data: { email: string }) => api.auth.sendMagicLink(data),
    onSuccess: () => {
      toast.success("Check your email for a magic link");
    },
    onError: (error: any) => {
      console.error("Magic link error:", error);
      toast.error(
        error?.body?.error?.message ||
          error?.body?.error ||
          error?.message ||
          "Failed to send magic link",
      );
    },
  });
};

export const useVerifyMagicLink = () => {
  const router = useRouter();
  const queryClient = useQueryClientSafe();

  return useMutation({
    mutationFn: (data: { token: string }) => api.auth.verifyMagicLink(data),
    onSuccess: (data) => {
      void queryClient?.invalidateQueries({ queryKey: ["me"] });
      const redirectTo =
        data.body.redirectTo ??
        getPostAuthRoute({
          role: data.body.role,
          requiresOnboarding: data.body.requiresOnboarding,
        });
      router.push(redirectTo);
      router.refresh();
    },
    onError: (error: any) => {
      console.error("Verify magic link error:", error);
      const errorMessage =
        error?.body?.error?.message ||
        error?.body?.error ||
        error?.message ||
        "Invalid or expired link";
      toast.error(errorMessage);
    },
  });
};

export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClientSafe();

  return useMutation({
    mutationFn: () => api.auth.v1Logout(),
    onSuccess: () => {
      queryClient?.clear();
      router.push("/login");
      router.refresh();
    },
    onError: (error: any) => {
      console.error("Logout error:", error);
      toast.error(
        error?.body?.error?.message ||
          error?.body?.error ||
          error?.message ||
          "Logout failed",
      );
    },
  });
};

export const useCompleteOnboarding = () => {
  const router = useRouter();
  const queryClient = useQueryClientSafe();

  return useMutation({
    mutationFn: (data: { fullName: string; displayName: string }) =>
      api.auth.completeOnboarding(data),
    onSuccess: async () => {
      toast.success("Onboarding complete");
      await queryClient?.invalidateQueries({ queryKey: ["me"] });
      router.push("/profile");
      router.refresh();
    },
    onError: (error: any) => {
      console.error("Complete onboarding error:", error);
      toast.error(
        error?.body?.error?.message ||
          error?.body?.error ||
          error?.message ||
          "Onboarding failed",
      );
    },
  });
};

export const useCompletePersonalOnboarding = () => {
  const router = useRouter();
  const queryClient = useQueryClientSafe();

  return useMutation({
    mutationFn: (data: {
      fullName: string;
      displayName: string;
      userRole: string;
    }) => api.auth.completePersonalOnboarding(data),
    onSuccess: async () => {
      toast.success("Onboarding complete");
      await queryClient?.invalidateQueries({ queryKey: ["me"] });
      router.push("/profile");
      router.refresh();
    },
    onError: (error: any) => {
      console.error("Complete onboarding error:", error);
      toast.error(
        error?.body?.error?.message ||
          error?.body?.error ||
          error?.message ||
          "Onboarding failed",
      );
    },
  });
};

export const useCompleteInstitutionalOnboarding = () => {
  const router = useRouter();
  const queryClient = useQueryClientSafe();

  return useMutation({
    mutationFn: (data: {
      fullName: string;
      displayName: string;
      userRole: string;
      institutionName: string;
      institutionType: string;
      affiliation?: string | null;
      city?: string | null;
      sizeRange?: string | null;
    }) => api.auth.completeInstitutionalOnboarding(data),
    onSuccess: async () => {
      toast.success("Onboarding complete");
      await queryClient?.invalidateQueries({ queryKey: ["me"] });
      router.push("/profile");
      router.refresh();
    },
    onError: (error: any) => {
      console.error("Complete onboarding error:", error);
      toast.error(
        error?.body?.error?.message ||
          error?.body?.error ||
          error?.message ||
          "Onboarding failed",
      );
    },
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.auth.me(),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};
