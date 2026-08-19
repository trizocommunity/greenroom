import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * Behavioural gate test for the `notifications` feature (BASIC=false, STANDARD+=true).
 *
 * `NotificationService.dispatch` must short-circuit when the festival's tier
 * (resolved through `loadFeatureOverrides` + `isEnabled`) does not have both
 * `notifications` and `schedule` enabled. The short-circuit prevents any DB
 * insert — there must be no orphan `programme_notification` rows for BASIC
 * festivals.
 */

const state = {
  festivalById: vi.fn(),
  featureOverrides: {} as Record<string, unknown>,
  insertCalls: 0,
};

vi.mock("@/core/database/client", () => ({
  db: {
    insert: () => {
      state.insertCalls += 1;
      return { values: () => Promise.resolve() };
    },
  },
}));

vi.mock("@/core/database/schema", () => ({
  programmeAssignment: { festivalId: {}, programmeId: {}, groupId: {} },
  programmeNotification: {},
  participant: { id: {}, festivalId: {}, groupId: {}, email: {}, isTeamLeader: {} },
}));

vi.mock("@/features/festivals/repositories/festival.repository", () => ({
  findFestivalById: (id: string) => state.festivalById(id),
}));

vi.mock("@/features/plan-features/services/plan-features.service", () => ({
  loadFeatureOverrides: () => Promise.resolve(state.featureOverrides),
}));

vi.mock("@/features/plan-features/services/feature-gate", () => ({
  isEnabled: (
    _tier: unknown,
    feature: string,
    overrides: Record<string, unknown> | null | undefined,
  ) => {
    if (overrides && feature in overrides) {
      return Boolean(overrides[feature]);
    }
    // Default to BASIC (everything off) when no override is set so the test
    // doesn't accidentally read TIER_CONFIG.
    return false;
  },
  getResolvedTier: (tier: unknown) => tier ?? "BASIC",
}));

vi.mock("@/features/assignments/services/programme-membership.service", () => ({
  ProgrammeMembershipService: {
    getParticipantsForProgramme: () => Promise.resolve([]),
  },
}));

import { NotificationService } from "./notification.service";

const FESTIVAL_ID = "fest-1";
const PROGRAMME_ID = "prog-1";

async function dispatchOnce() {
  return NotificationService.dispatch({
    eventType: "REPORTING_STARTED",
    festivalId: FESTIVAL_ID,
    targets: { programmeId: PROGRAMME_ID },
    context: {
      title: "Programme reporting started",
      body: "Stage reporting has started. Please report to the stage manager.",
    },
    channels: ["IN_APP"],
  });
}

describe("NotificationService.dispatch — `notifications` feature gate", () => {
  beforeEach(() => {
    state.festivalById.mockReset();
    state.featureOverrides = {};
    state.insertCalls = 0;
  });

  it("returns created=0 and skips insert when `notifications` is disabled (BASIC)", async () => {
    state.festivalById.mockResolvedValue({ id: FESTIVAL_ID, tier: "BASIC" });
    state.featureOverrides = { notifications: false, schedule: true };

    const result = await dispatchOnce();

    expect(result).toEqual({ created: 0 });
    expect(state.insertCalls).toBe(0);
  });

  it("returns created=0 and skips insert when `schedule` is disabled even with `notifications` on", async () => {
    state.festivalById.mockResolvedValue({ id: FESTIVAL_ID, tier: "STANDARD" });
    state.featureOverrides = { notifications: true, schedule: false };

    const result = await dispatchOnce();

    expect(result).toEqual({ created: 0 });
    expect(state.insertCalls).toBe(0);
  });
});
