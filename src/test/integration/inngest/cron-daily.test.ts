/**
 * Issue 47 sub-slice C — cron-daily Inngest function test.
 *
 * Triggers the function with a fake Inngest context and asserts the
 * three sub-runs (expiry-warnings, expiring-soon-emails, export-gc)
 * were called and returned counts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRunNotificationsCycle = vi.fn();
const mockRunFestivalExpiringSoonEmails = vi.fn();
const mockDeleteExpiredExports = vi.fn();

vi.mock("@/features/exports/repositories/export.repository", () => ({
  deleteExpiredExports: () => mockDeleteExpiredExports(),
}));

vi.mock(
  "@/features/festivals/services/festival-expiry-notifier.service",
  () => ({
    FestivalExpiryNotifier: {
      runNotificationsCycle: () => mockRunNotificationsCycle(),
      runFestivalExpiringSoonEmails: () => mockRunFestivalExpiringSoonEmails(),
    },
  }),
);

import { cronDaily } from "@/inngest/functions/cron-daily";

function makeStep() {
  return {
    run: async (_name: string, fn: () => Promise<unknown>) => fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRunNotificationsCycle.mockResolvedValue({
    processed: 3,
    warned: 1,
    skipped: 2,
  });
  mockRunFestivalExpiringSoonEmails.mockResolvedValue({
    processed: 2,
    sent: 1,
    skipped: 1,
  });
  mockDeleteExpiredExports.mockResolvedValue(5);
});

describe("cronDaily", () => {
  it("runs all three sub-steps and returns the aggregated counts", async () => {
    const fn = cronDaily as unknown as (ctx: unknown) => Promise<unknown>;
    const result = await fn({
      step: makeStep(),
    });

    expect(mockRunNotificationsCycle).toHaveBeenCalledTimes(1);
    expect(mockRunFestivalExpiringSoonEmails).toHaveBeenCalledTimes(1);
    expect(mockDeleteExpiredExports).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      notifications: { processed: 3, warned: 1, skipped: 2 },
      expiringSoon: { processed: 2, sent: 1, skipped: 1 },
      exportsDeleted: 5,
    });
  });
});
