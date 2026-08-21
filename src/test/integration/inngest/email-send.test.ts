/**
 * Issue 47 sub-slice C — email-send Inngest function test.
 *
 * Confirms:
 *   - Resend 4xx → NonRetriableError (no retry)
 *   - Resend 2xx → success returned to caller
 */

import { NonRetriableError } from "inngest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSendEmailSync = vi.fn();

vi.mock("@/core/integrations/email/send", () => ({
  sendEmailSync: (...args: unknown[]) => mockSendEmailSync(...args),
}));

import { emailSend } from "@/inngest/functions/email-send";

function makeStep() {
  return {
    run: async (_name: string, fn: () => Promise<unknown>) => fn(),
  };
}

const FAILED: { error: { message: string; statusCode: number } } = {
  error: { message: "bad template", statusCode: 422 },
};
const SUCCESS = { id: "email-1" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("emailSend", () => {
  it("succeeds and returns the send result on 2xx", async () => {
    mockSendEmailSync.mockResolvedValue(SUCCESS);
    const fn = emailSend as unknown as (ctx: unknown) => Promise<unknown>;
    const result = await fn({
      event: { data: { opts: { kind: "test", to: "x@y.z" } } },
      step: makeStep(),
    });
    expect(result).toEqual({ ok: true, result: SUCCESS });
  });

  it("throws NonRetriableError on 4xx so Inngest stops retrying", async () => {
    mockSendEmailSync.mockResolvedValue(FAILED);
    const fn = emailSend as unknown as (ctx: unknown) => Promise<unknown>;
    await expect(
      fn({
        event: { data: { opts: { kind: "test", to: "x@y.z" } } },
        step: makeStep(),
      }),
    ).rejects.toBeInstanceOf(NonRetriableError);
  });

  it("re-throws on 5xx so Inngest retries", async () => {
    mockSendEmailSync.mockResolvedValue({
      error: { message: "transient", statusCode: 503 },
    });
    const fn = emailSend as unknown as (ctx: unknown) => Promise<unknown>;
    await expect(
      fn({
        event: { data: { opts: { kind: "test", to: "x@y.z" } } },
        step: makeStep(),
      }),
    ).rejects.toThrow("transient");
  });
});
