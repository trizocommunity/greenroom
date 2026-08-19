/**
 * Issue 47 sub-slice C.2 — Razorpay webhook signature verification tests.
 *
 * Covers:
 *   - 200 OK + queued on a valid HMAC
 *   - 403 on an invalid HMAC
 *   - 400 on a missing X-Razorpay-Signature header
 *   - 400 on a malformed JSON body
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";

vi.mock("server-only", () => ({}));

const mockEnqueue = vi.fn();

vi.mock("@/features/payments/services/razorpay-webhook.service", () => ({
  verifyRazorpayWebhookSignature: (raw: string, sig: string) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
    const expected = crypto
      .createHmac("sha256", secret)
      .update(raw)
      .digest("hex");
    return expected === sig;
  },
  enqueueRazorpayWebhook: (...args: unknown[]) => mockEnqueue(...args),
}));

import { POST } from "@/app/api/v1/payments/webhook/route";

const SECRET = "test-razorpay-secret";
const RAW_BODY = JSON.stringify({
  event: "payment.captured",
  id: "evt-1",
  payload: { foo: "bar" },
});

function sign(body: string): string {
  return crypto.createHmac("sha256", SECRET).update(body).digest("hex");
}

beforeEach(() => {
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  vi.clearAllMocks();
  mockEnqueue.mockResolvedValue(undefined);
});

function makeRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://test/api/v1/payments/webhook", {
    method: "POST",
    body,
    headers,
  });
}

describe("POST /api/v1/payments/webhook", () => {
  it("returns 200 OK and enqueues on a valid signature", async () => {
    const res = await POST(
      makeRequest(RAW_BODY, {
        "x-razorpay-signature": sign(RAW_BODY),
      }) as never,
    );

    expect(res.status).toBe(200);
    expect(mockEnqueue).toHaveBeenCalledWith("evt-1", {
      foo: "bar",
    });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.eventId).toBe("evt-1");
  });

  it("returns 403 on an invalid signature", async () => {
    const res = await POST(
      makeRequest(RAW_BODY, {
        "x-razorpay-signature": "deadbeef",
      }) as never,
    );

    expect(res.status).toBe(403);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it("returns 400 when the signature header is missing", async () => {
    const res = await POST(makeRequest(RAW_BODY) as never);
    expect(res.status).toBe(400);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it("returns 400 on a malformed JSON body", async () => {
    const res = await POST(
      makeRequest("{not-json", {
        "x-razorpay-signature": sign("{not-json"),
      }) as never,
    );
    expect(res.status).toBe(400);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});
