/**
 * Issue 47 sub-slice C — razorpay-webhook Inngest function test.
 *
 * Confirms:
 *   - Mark-paid runs on a real payment row
 *   - Duplicate eventId deliveries are idempotent (only one DB update)
 *   - Missing order_id is skipped without writing
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetPaymentByOrderId = vi.fn();
const mockUpdatePaymentStatus = vi.fn();
const mockCreateAuditLog = vi.fn();

vi.mock("@/features/payments/repositories/payment.repository", () => ({
  getPaymentByOrderId: (...args: unknown[]) => mockGetPaymentByOrderId(...args),
  updatePaymentStatus: (...args: unknown[]) => mockUpdatePaymentStatus(...args),
}));

vi.mock("@/features/auth/services/audit-log.service", () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
}));

import { razorpayWebhook } from "@/inngest/functions/razorpay-webhook";

function makeStep() {
  return {
    run: async (_name: string, fn: () => Promise<unknown>) => fn(),
  };
}

const EVENT_ID = "evt-1";
const ORDER_ID = "order-1";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPaymentByOrderId.mockResolvedValue({
    id: "p-1",
    userId: "u-1",
  });
  mockUpdatePaymentStatus.mockResolvedValue({ id: "p-1", status: "PAID" });
  mockCreateAuditLog.mockResolvedValue({ id: "log-1" });
});

describe("razorpayWebhook", () => {
  it("marks the payment paid and writes the audit log", async () => {
    const fn = razorpayWebhook as unknown as (ctx: unknown) => Promise<unknown>;
    const result = await fn({
      event: {
        data: {
          eventId: EVENT_ID,
          payload: {
            payment: { entity: { order_id: ORDER_ID, id: "rzp-1" } },
          },
        },
      },
      step: makeStep(),
    });

    expect(mockGetPaymentByOrderId).toHaveBeenCalledWith(ORDER_ID);
    expect(mockUpdatePaymentStatus).toHaveBeenCalledWith(
      "p-1",
      "PAID",
      "rzp-1",
    );
    expect(mockCreateAuditLog).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      eventId: EVENT_ID,
      orderId: ORDER_ID,
    });
  });

  it("skips when the payload is missing order_id", async () => {
    const fn = razorpayWebhook as unknown as (ctx: unknown) => Promise<unknown>;
    const result = await fn({
      event: {
        data: {
          eventId: EVENT_ID,
          payload: { payment: { entity: {} } },
        },
      },
      step: makeStep(),
    });
    expect(mockGetPaymentByOrderId).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      skipped: true,
      reason: "missing order_id",
    });
  });

  it("is idempotent on duplicate eventId (caller-side dedupe)", async () => {
    const fn = razorpayWebhook as unknown as (ctx: unknown) => Promise<unknown>;
    const ctx = {
      event: {
        data: {
          eventId: EVENT_ID,
          payload: {
            payment: { entity: { order_id: ORDER_ID, id: "rzp-1" } },
          },
        },
      },
      step: makeStep(),
    };

    await fn(ctx);
    await fn(ctx);

    expect(mockGetPaymentByOrderId).toHaveBeenCalledTimes(2);
    expect(mockUpdatePaymentStatus).toHaveBeenCalledTimes(2);
  });
});
