/**
 * Issue 47 sub-slice C — resend-webhook Inngest function test.
 *
 * Confirms:
 *   - email.bounced publishes to greenroom:email:bounce via Redis
 *   - email.delivered is a no-op (no prefs change, no publish)
 *   - Missing event type is skipped
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSetEnabled = vi.fn();
const mockRedisPublish = vi.fn();

vi.mock(
  "@/features/email-preferences/services/email-preferences.service",
  () => ({
    EmailPreferencesService: {
      setEnabled: (...args: unknown[]) => mockSetEnabled(...args),
    },
  }),
);

vi.mock("@/core/redis/client", () => ({
  getRedis: () => ({
    publish: (...args: unknown[]) => mockRedisPublish(...args),
  }),
}));

import { resendWebhook } from "@/inngest/functions/resend-webhook";

function makeStep() {
  return {
    run: async (_name: string, fn: () => Promise<unknown>) => fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSetEnabled.mockResolvedValue({ id: "pref-1" });
  mockRedisPublish.mockResolvedValue(1);
});

describe("resendWebhook", () => {
  it("publishes to the bounce channel on email.bounced", async () => {
    const fn = resendWebhook as unknown as (ctx: unknown) => Promise<unknown>;
    const result = await fn({
      event: {
        data: {
          eventId: "evt-1",
          payload: {
            type: "email.bounced",
            to: "user@example.com",
            tags: [{ name: "kind", value: "announcements" }],
          },
        },
      },
      step: makeStep(),
    });

    expect(mockSetEnabled).toHaveBeenCalledWith("announcements", false);
    expect(mockRedisPublish).toHaveBeenCalledTimes(1);
    const channel = mockRedisPublish.mock.calls[0]?.[0] as string;
    expect(channel).toBe("greenroom:email:bounce");
    const payload = JSON.parse(mockRedisPublish.mock.calls[0]?.[1] as string);
    expect(payload.type).toBe("email.bounced");
    expect(payload.recipient).toBe("user@example.com");
    expect(result).toMatchObject({ ok: true, eventId: "evt-1" });
  });

  it("is a no-op on email.delivered", async () => {
    const fn = resendWebhook as unknown as (ctx: unknown) => Promise<unknown>;
    const result = await fn({
      event: {
        data: {
          eventId: "evt-2",
          payload: {
            type: "email.delivered",
            to: "user@example.com",
          },
        },
      },
      step: makeStep(),
    });

    expect(mockSetEnabled).not.toHaveBeenCalled();
    expect(mockRedisPublish).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      eventId: "evt-2",
      eventType: "email.delivered",
    });
  });

  it("skips when the event type is missing", async () => {
    const fn = resendWebhook as unknown as (ctx: unknown) => Promise<unknown>;
    const result = await fn({
      event: {
        data: {
          eventId: "evt-3",
          payload: { to: "user@example.com" },
        },
      },
      step: makeStep(),
    });
    expect(mockRedisPublish).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      skipped: true,
      reason: "missing event type",
    });
  });
});
