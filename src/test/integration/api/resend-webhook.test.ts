/**
 * Issue 47 sub-slice C.2 — Resend webhook signature verification tests.
 *
 * Covers:
 *   - 200 OK + queued on a valid HMAC
 *   - 403 on an invalid HMAC
 *   - 400 on missing svix headers
 *   - 400 on a malformed JSON body
 */

import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockEnqueue = vi.fn();

vi.mock("@/core/integrations/email/resend-webhook.service", () => ({
  verifyResendWebhookSignature: (
    raw: string,
    sig: string,
    id: string,
    ts: string,
  ) => {
    const secret = process.env.RESEND_WEBHOOK_SECRET ?? "";
    const b64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const key = Buffer.from(b64, "base64");
    const expected = crypto
      .createHmac("sha256", key)
      .update(`${id}.${ts}.${raw}`)
      .digest("base64");
    const candidates = sig
      .split(" ")
      .filter((p) => p.startsWith("v1,"))
      .map((p) => p.slice(3));
    return candidates.some((c) => c === expected);
  },
  enqueueResendWebhook: (...args: unknown[]) => mockEnqueue(...args),
}));

import { POST } from "@/app/api/v1/resend/webhook/route";

const SECRET_B64 = Buffer.from("test-resend-secret").toString("base64");
const SECRET = `whsec_${SECRET_B64}`;
const RAW_BODY = JSON.stringify({
  type: "email.bounced",
  data: { to: "user@example.com" },
});
const SVIX_ID = "msg-1";
const SVIX_TS = String(Math.floor(Date.now() / 1000));

function sign(body: string, id: string, ts: string): string {
  const key = Buffer.from(SECRET_B64, "base64");
  const expected = crypto
    .createHmac("sha256", key)
    .update(`${id}.${ts}.${body}`)
    .digest("base64");
  return `v1,${expected}`;
}

beforeEach(() => {
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  vi.clearAllMocks();
  mockEnqueue.mockResolvedValue(undefined);
});

function makeRequest(
  body: string,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://test/api/v1/resend/webhook", {
    method: "POST",
    body,
    headers,
  });
}

describe("POST /api/v1/resend/webhook", () => {
  it("returns 200 OK and enqueues on a valid signature", async () => {
    const res = await POST(
      makeRequest(RAW_BODY, {
        "svix-id": SVIX_ID,
        "svix-timestamp": SVIX_TS,
        "svix-signature": sign(RAW_BODY, SVIX_ID, SVIX_TS),
      }) as never,
    );

    expect(res.status).toBe(200);
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.eventId).toBe(`email.bounced-${SVIX_ID}`);
  });

  it("returns 403 on an invalid signature", async () => {
    const res = await POST(
      makeRequest(RAW_BODY, {
        "svix-id": SVIX_ID,
        "svix-timestamp": SVIX_TS,
        "svix-signature": "v1,deadbeef",
      }) as never,
    );

    expect(res.status).toBe(403);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it("returns 400 when svix headers are missing", async () => {
    const res = await POST(makeRequest(RAW_BODY) as never);
    expect(res.status).toBe(400);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it("returns 400 on a malformed JSON body", async () => {
    const body = "{not-json";
    const res = await POST(
      makeRequest(body, {
        "svix-id": SVIX_ID,
        "svix-timestamp": SVIX_TS,
        "svix-signature": sign(body, SVIX_ID, SVIX_TS),
      }) as never,
    );
    expect(res.status).toBe(400);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});
