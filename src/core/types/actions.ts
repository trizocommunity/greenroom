/**
 * Standard return type for server actions.
 * Convention: all actions should return ActionResponse<T> and use handleActionError
 * in catch blocks instead of throwing. Throw only for unexpected/unhandled cases.
 */
export type ActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; fields?: Record<string, string> };
