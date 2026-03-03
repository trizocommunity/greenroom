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
    joined: (userId: string) => ["festivals", "joined", userId] as const,
    details: () => ["festivals", "detail"] as const,
    detail: (id: string) => ["festivals", "detail", id] as const,
  },

  /**
   * Festival Pre-works Data (Categories, Groups, Programmes, Students, Assignments)
   */
  categories: {
    all: () => ["categories"] as const,
    list: (festivalId: string) => ["categories", "list", festivalId] as const,
  },
  groups: {
    all: () => ["groups"] as const,
    list: (festivalId: string) => ["groups", "list", festivalId] as const,
  },
  programmes: {
    all: () => ["programmes"] as const,
    list: (festivalId: string) => ["programmes", "list", festivalId] as const,
    detail: (festivalId: string, programmeId: string) =>
      ["programmes", "detail", festivalId, programmeId] as const,
  },
  students: {
    all: () => ["students"] as const,
    list: (festivalId: string) => ["students", "list", festivalId] as const,
  },
  assignments: {
    all: () => ["assignments"] as const,
    list: (festivalId: string) => ["assignments", "list", festivalId] as const,
  },
  members: {
    all: () => ["members"] as const,
    list: (festivalId: string) => ["members", "list", festivalId] as const,
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
    unusedCredit: (userId?: string) =>
      ["payments", "unused-credit", { userId }] as const,
    history: (userId?: string) => ["payments", "history", { userId }] as const,
    billingHistory: (userId?: string) =>
      ["payments", "billingHistory", { userId }] as const,
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
   * Support / Notifications
   */
  support: {
    all: () => ["support"] as const,
    notifications: (userId?: string) =>
      ["support", "notifications", { userId }] as const,
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
