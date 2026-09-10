/**
 * checkpoint-idle-close Inngest function test.
 *
 * Mirrors cron-daily.test.ts: triggers the function with a fake Inngest
 * context and asserts it calls the idle-close service with the 10-minute
 * threshold and returns the service's result.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockCloseIdle = vi.fn();

vi.mock("@/features/checkpoints/services/checkpoint.service", () => ({
  closeIdleCheckpointSessions: (idleMinutes: number) =>
    mockCloseIdle(idleMinutes),
}));

// `inngest.createFunction` returns the inner handler directly when we pass a
// plain function — Inngest's real one wraps it for runtime introspection.
vi.mock("@/inngest/client", () => ({
  inngest: {
    createFunction: (
      _opts: unknown,
      handler: (ctx: unknown) => Promise<unknown>,
    ) => handler,
  },
}));

import { checkpointIdleClose } from "@/inngest/functions/checkpoint-idle-close";

function makeStep() {
  return {
    run: async (_name: string, fn: () => Promise<unknown>) => fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCloseIdle.mockResolvedValue({ closed: 2, ids: ["s1", "s2"] });
});

describe("checkpointIdleClose", () => {
  it("closes sessions idle for 10 minutes and returns the result", async () => {
    const fn = checkpointIdleClose as unknown as (
      ctx: unknown,
    ) => Promise<unknown>;
    const result = await fn({ step: makeStep() });

    expect(mockCloseIdle).toHaveBeenCalledTimes(1);
    expect(mockCloseIdle).toHaveBeenCalledWith(10);
    expect(result).toEqual({ closed: 2, ids: ["s1", "s2"] });
  });
});
