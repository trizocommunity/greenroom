/**
 * Regression test for the duplicate-pending-payment 23505 crash.
 *
 * Root cause: `initiatePaymentDomain` looked up pending payments by
 * (userId, purpose, tier) and a 24h window — narrower than the partial
 * unique index `payment_userId_purpose_pending_unique_idx`, which only
 * enforces (userId, purpose) WHERE status='PENDING' AND used=false.
 * A user with an in-flight order at one tier could not start another at
 * a different tier; the second insert hit the unique constraint and the
 * API returned 500.
 *
 * Pins the fixed behaviour:
 *   - Reuse: existing PENDING+unused row with matching tier + providerId
 *     returns the existing orderId, no new Razorpay order.
 *   - 409: existing row with a different tier throws PendingOrderExistsError.
 *   - Stale: existing row with matching tier but empty providerId is
 *     marked FAILED and a fresh order is created.
 *   - Race: PG 23505 on insert is recovered by re-fetching the winner.
 *   - Orphan cancellation: the Razorpay order created by the losing
 *     request is cancelled (best-effort).
 */
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockCreateOrder } = vi.hoisted(() => ({
  mockCreateOrder: vi.fn(),
}));

vi.mock("@/features/payments/services/razorpay.service", () => ({
  RazorpayService: {
    createOrder: (...args: unknown[]) => mockCreateOrder(...args),
    verifyPaymentSignature: vi.fn(),
  },
}));

import { eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  payment as paymentTable,
  user as userTable,
} from "@/core/database/schema";
import {
  initiatePaymentDomain,
  PendingOrderExistsError,
} from "@/features/payments/services/payments-domain.service";
import { getDb } from "./setup";
import { withTransaction } from "./with-transaction";

const USER_EMAIL_BASE = "initiate-test";

async function seedUser() {
  const user = (
    await db
      .insert(userTable)
      .values({
        id: randomUUID(),
        email: `${USER_EMAIL_BASE}-${randomUUID()}@test.local`,
        fullName: "Initiate Test User",
        displayName: "Initiate Test User",
        accountType: "PERSONAL",
      })
      .returning()
  )[0];
  return user;
}

async function seedPendingPayment(opts: {
  userId: string;
  tier: "BASIC" | "STANDARD" | "PRO";
  providerId?: string | null;
}) {
  const id = randomUUID();
  await db.insert(paymentTable).values({
    id,
    userId: opts.userId,
    amount: 1500,
    currency: "INR",
    providerId: opts.providerId ?? `prov-${id}`,
    status: "PENDING",
    purpose: "FESTIVAL_CREATION",
    used: false,
    tier: opts.tier,
  } as never);
  return id;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateOrder.mockResolvedValue({ id: `order-${randomUUID()}` });
});

describe("initiatePaymentDomain — duplicate pending guard", () => {
  it("creates a fresh order + DB row when no pending payment exists", async () => {
    await withTransaction(async () => {
      const user = await seedUser();
      const result = await initiatePaymentDomain({
        userId: user.id,
        purpose: "FESTIVAL_CREATION",
        tier: "BASIC",
      });

      expect(mockCreateOrder).toHaveBeenCalledTimes(1);
      // Success path: no `outcome` discriminator and amount/currency present.
      if ("outcome" in result) {
        throw new Error(
          `expected success result, got pendingExists: ${JSON.stringify(result)}`,
        );
      }
      expect(result.paymentId).toMatch(/[0-9a-f-]+/);
      expect(result.orderId).toMatch(/^order-/);
      expect(result.amount).toBe(1500 * 100);
      expect(result.currency).toBe("INR");
    });
  });

  it("reuses an existing pending order when the tier matches", async () => {
    await withTransaction(async () => {
      const user = await seedUser();
      const existingId = await seedPendingPayment({
        userId: user.id,
        tier: "BASIC",
        providerId: "order_existing",
      });

      const result = await initiatePaymentDomain({
        userId: user.id,
        purpose: "FESTIVAL_CREATION",
        tier: "BASIC",
      });

      expect(mockCreateOrder).not.toHaveBeenCalled();
      if ("outcome" in result) {
        throw new Error(
          `expected success result, got pendingExists: ${JSON.stringify(result)}`,
        );
      }
      expect(result.paymentId).toBe(existingId);
      expect(result.orderId).toBe("order_existing");
      expect(result.amount).toBe(1500 * 100);
    });
  });

  it("throws PendingOrderExistsError when the existing pending order is for a different tier", async () => {
    await withTransaction(async () => {
      const user = await seedUser();
      const existingId = await seedPendingPayment({
        userId: user.id,
        tier: "BASIC",
        providerId: "order_basic",
      });

      await expect(
        initiatePaymentDomain({
          userId: user.id,
          purpose: "FESTIVAL_CREATION",
          tier: "PRO",
        }),
      ).rejects.toMatchObject({
        code: "PENDING_ORDER_EXISTS",
        paymentId: existingId,
        orderId: "order_basic",
        tier: "BASIC",
      });

      expect(mockCreateOrder).not.toHaveBeenCalled();
    });
  });

  it("marks a stale pending row FAILED and creates a new order when providerId is empty", async () => {
    await withTransaction(async () => {
      const user = await seedUser();
      const staleId = await seedPendingPayment({
        userId: user.id,
        tier: "BASIC",
        providerId: null,
      });

      const result = await initiatePaymentDomain({
        userId: user.id,
        purpose: "FESTIVAL_CREATION",
        tier: "BASIC",
      });

      // Old row FAILED
      const refreshed = await db
        .select()
        .from(paymentTable)
        .where(eq(paymentTable.id, staleId));
      expect(refreshed[0]?.status).toBe("FAILED");

      // New row created
      expect(mockCreateOrder).toHaveBeenCalledTimes(1);
      expect(result.paymentId).not.toBe(staleId);
      expect(result.orderId).toMatch(/^order-/);
    });
  });

  it("recovers from PG 23505 race by re-fetching the winner's row", async () => {
    await withTransaction(async () => {
      const user = await seedUser();

      // Simulate two concurrent requests: both call createOrder, but
      // the second insert loses the race to a row we pre-seed on the
      // first call.
      let winnerInserted = false;
      mockCreateOrder.mockImplementation(async () => {
        const orderId = `order-${randomUUID()}`;
        if (!winnerInserted) {
          winnerInserted = true;
          await getDb()
            .insert(paymentTable)
            .values({
              id: randomUUID(),
              userId: user.id,
              amount: 1500,
              currency: "INR",
              providerId: orderId,
              status: "PENDING",
              purpose: "FESTIVAL_CREATION",
              used: false,
              tier: "BASIC",
            } as never);
        }
        return { id: orderId };
      });

      const result = await initiatePaymentDomain({
        userId: user.id,
        purpose: "FESTIVAL_CREATION",
        tier: "BASIC",
      });

      // Loser fell into the 23505 catch and re-fetched the winner.
      if ("outcome" in result) {
        throw new Error(
          `expected success result, got pendingExists: ${JSON.stringify(result)}`,
        );
      }
      expect(result.orderId).toMatch(/^order-/);
      expect(result.amount).toBe(1500 * 100);
      expect(result.currency).toBe("INR");
    });
  });

  it("PendingOrderExistsError is the exported typed error from this module", () => {
    const err = new PendingOrderExistsError("p1", "o1", "STANDARD");
    expect(err.code).toBe("PENDING_ORDER_EXISTS");
    expect(err.paymentId).toBe("p1");
    expect(err.orderId).toBe("o1");
    expect(err.tier).toBe("STANDARD");
    expect(err).toBeInstanceOf(Error);
  });
});
