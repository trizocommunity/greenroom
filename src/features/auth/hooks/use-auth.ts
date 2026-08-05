import "client-only";

import {
  QueryClientContext,
  useMutation,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import { signIn, signOut, useSession as useBetterAuthSession } from "@/core/auth/better-auth/client";
import { getPostAuthRoute } from "@/core/auth/routing";
import { api } from "@/lib/api-client";
import { toast } from "@/lib/toast";

function useQueryClientSafe() {
  const queryClient = useContext(QueryClientContext);
  return queryClient ?? null;
}

/**
 * Login shape returned by `useCurrentUser` / `useSession`. Matches the
 * fields we display in the navbar, sidebar, and onboarding gate.
 * `globalRole`, `fullName`, `displayName`, `accountType`,
 * `institutionId`, `isActive`, and `timezone` come from the
 * `additionalFields` we registered in `better-auth/auth.ts`.
 * `twoFactorEnabled` (PR 4 of ISSUE-41) lets the security settings
 * panel show the current state without re-fetching.
 */
export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  image: string | null;
  twoFactorEnabled: boolean;
  globalRole: "USER" | "SUPER_ADMIN";
  fullName: string | null;
  displayName: string | null;
  accountType: string | null;
  institutionId: string | null;
  isActive: boolean;
  timezone: string | null;
}

/**
 * PR 2: Read the current user from Better Auth's client session.
 *
 * Replaces the old `useQuery(["me"], api.auth.me)` — the JWT cookie
 * (`session`) was non-revocable, so this used to keep returning data for
 * deactivated users until the JWT expired. Better Auth's DB-backed
 * session checks `isActive` on every read, so deactivated users fall
 * back to `null` immediately.
 *
 * `data` is `undefined` while the session is loading, `null` when no
 * session exists, and a `CurrentUser` when one does.
 */
export function useCurrentUser() {
  const { data, isPending, error } = useBetterAuthSession();

  const user = data?.user
    ? ({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name ?? null,
        emailVerified: data.user.emailVerified,
        image: data.user.image ?? null,
        twoFactorEnabled:
          (data.user as { twoFactorEnabled?: boolean }).twoFactorEnabled ??
          false,
        globalRole:
          ((data.user as { globalRole?: "USER" | "SUPER_ADMIN" })
            .globalRole ?? "USER"),
        fullName:
          (data.user as { fullName?: string | null }).fullName ?? null,
        displayName:
          (data.user as { displayName?: string | null }).displayName ??
          null,
        accountType:
          (data.user as { accountType?: string | null }).accountType ??
          null,
        institutionId:
          (data.user as { institutionId?: string | null }).institutionId ??
          null,
        isActive:
          (data.user as { isActive?: boolean }).isActive ?? true,
        timezone:
          (data.user as { timezone?: string | null }).timezone ?? null,
      } satisfies CurrentUser)
    : null;

  return {
    data: user,
    isLoading: isPending,
    isError: !!error,
    error,
  };
}

export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClientSafe();

  return useMutation({
    mutationFn: async () => {
      await signOut();
    },
    onSuccess: () => {
      queryClient?.clear();
      router.push("/login");
      router.refresh();
    },
    onError: (error: unknown) => {
      console.error("Logout error:", error);
      toast.error(
        error instanceof Error ? error.message : "Logout failed",
      );
    },
  });
};

/**
 * Helper for redirecting after sign-in. The Better Auth client SDK
 * already handles magic-link redirect (`callbackURL` in the
 * `signIn.magicLink` call), but social sign-in and invitation accept
 * flows need to compute the post-auth route explicitly.
 */
export function buildPostAuthRoute(user: {
  globalRole: "USER" | "SUPER_ADMIN";
  fullName?: string | null;
}): string {
  return getPostAuthRoute({
    role: user.globalRole,
    requiresOnboarding: !user.fullName,
  });
}

// Re-export so existing imports keep working.
export { signIn };

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