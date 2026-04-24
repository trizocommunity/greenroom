/**
 * App-wide config. Add feature flags or toggles here when they are wired to UI/routing.
 */
export const systemConfig = {
  /** When true, creating a festival requires an unused payment (e.g. from overview flow). */
  paymentFirstFlowEnabled: false,
} as const;
