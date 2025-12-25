/**
 * Centralized Query Keys Factory
 *
 * Following React Query best practices for hierarchical query key structure.
 * This ensures consistent query key usage across the application and makes
 * it easier to invalidate related queries.
 *
 * @see https://tanstack.com/query/latest/docs/react/guides/query-keys
 */

export const queryKeys = {
  /**
   * Authentication-related queries
   */
  auth: {
    all: () => ["auth"] as const,
    currentUser: () => ["auth", "currentUser"] as const,
  },

  /**
   * Festival-related queries
   */
  festivals: {
    all: () => ["festivals"] as const,
    lists: () => ["festivals", "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["festivals", "list", { ...filters }] as const,
    details: () => ["festivals", "detail"] as const,
    detail: (id: string) => ["festivals", "detail", id] as const,
  },

  /**
   * Edition-related queries
   */
  editions: {
    all: () => ["editions"] as const,
    lists: () => ["editions", "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["editions", "list", { ...filters }] as const,
    details: () => ["editions", "detail"] as const,
    detail: (id: string) => ["editions", "detail", id] as const,
  },

  /**
   * Payment-related queries
   */
  payments: {
    all: () => ["payments"] as const,
    lists: () => ["payments", "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["payments", "list", { ...filters }] as const,
    status: (userId?: string) => ["payments", "status", { userId }] as const,
    history: (userId?: string) => ["payments", "history", { userId }] as const,
    details: () => ["payments", "detail"] as const,
    detail: (id: string) => ["payments", "detail", id] as const,
  },

  /**
   * User management queries (Super Admin)
   */
  users: {
    all: () => ["users"] as const,
    lists: () => ["users", "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["users", "list", { ...filters }] as const,
    details: () => ["users", "detail"] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },

  /**
   * Audit Logs
   */
  auditLogs: {
    all: () => ["auditLogs"] as const,
    lists: () => ["auditLogs", "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["auditLogs", "list", { ...filters }] as const,
  },
} as const;
