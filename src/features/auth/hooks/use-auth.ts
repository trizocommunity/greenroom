import "client-only";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "@/lib/api-client";

export const useLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.auth.login(data),
    onSuccess: (data) => {
      toast.success("Logged in successfully");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      if (data.body.role === "SUPER_ADMIN") {
        router.push("/super-admin");
      } else {
        router.push("/profile");
      }
      router.refresh();
    },
    onError: (error: any) => {
      console.error("Login error:", error);
      const errorMessage =
        error?.body?.error || error?.message || "Login failed";
      toast.error(errorMessage);
    },
  });
};

export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      queryClient.clear();
      router.push("/login");
      router.refresh();
    },
    onError: (error: any) => {
      console.error("Logout error:", error);
      toast.error(error?.body?.error || error?.message || "Logout failed");
    },
  });
};

export const useRegister = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.auth.register(data),
    onSuccess: () => {
      toast.success("Registration successful");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      router.push("/profile");
      router.refresh();
    },
    onError: (error: any) => {
      console.error("Register error:", error);
      toast.error(
        error?.body?.error || error?.message || "Registration failed",
      );
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (data: { email: string }) => api.auth.forgotPassword(data),
    onSuccess: () => {
      toast.success("Password reset email sent");
    },
    onError: (error: any) => {
      console.error("Forgot password error:", error);
      toast.error(error?.body?.error || error?.message || "Request failed");
    },
  });
};

export const useResetPassword = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: {
      token: string;
      password: string;
      confirmPassword: string;
    }) => api.auth.resetPassword(data),
    onSuccess: () => {
      toast.success("Password reset successful");
      router.push("/login");
    },
    onError: (error: any) => {
      console.error("Reset password error:", error);
      toast.error(error?.body?.error || error?.message || "Reset failed");
    },
  });
};

export const useCompleteOnboarding = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { fullName: string; displayName: string }) =>
      api.auth.completeOnboarding(data),
    onSuccess: () => {
      toast.success("Onboarding complete");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      router.push("/dashboard");
      router.refresh();
    },
    onError: (error: any) => {
      console.error("Complete onboarding error:", error);
      toast.error(error?.body?.error || error?.message || "Onboarding failed");
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
