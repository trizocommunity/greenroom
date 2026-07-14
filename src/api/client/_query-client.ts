import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";

const RETRY_DELAY_MAP: Record<number, number> = {
  0: 0,
  1: 1000,
  2: 2000,
  3: 4000,
  4: 8000,
  5: 16000,
};

export const CACHE_TAGS = {
  FESTIVALS: "festivals",
  FESTIVAL: (id: string) => `festival:${id}`,
  USERS: "users",
  USER: (id: string) => `user:${id}`,
  PAYMENTS: "payments",
  PROFILE: "profile",
  ANALYTICS: "analytics",
} as const;

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (failureCount > 5) return false;
          if (error && "status" in error) {
            const status = error.status;
            if (status === 401 || status === 403 || status === 404) {
              return false;
            }
          }
          return true;
        },
        retryDelay: (attemptIndex) => RETRY_DELAY_MAP[attemptIndex] ?? 16000,
      },
      mutations: {
        retry: 0,
        onError: (error) => {
          if (process.env.NODE_ENV === "development") {
            console.error("[Mutation Error]", error);
          }
        },
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

export type { QueryClient };
