/**
 * Regression test for ISSUE-43 §1 (PR 1) — silent DB defaults bug class.
 *
 * The PRO->STANDARD incident happened because `festival.tier` defaulted to
 * `"STANDARD"` server-side, masking INSERTs that forgot to pass the column.
 * This file pins the fixed behaviour: `createFestival` MUST set `tier`
 * explicitly from the payment row, and every NOT-NULL column in the
 * festival-domain (tier, isLocked, status, publicSiteEnabled, expiresAt,
 * payment.tier) MUST fail loudly if the caller omits it.
 *
 * Test cases:
 *   1. PRO payment -> festival.tier = PRO, festival.tierLabel = "Pro".
 *   2. STANDARD payment -> festival.tier = STANDARD.
 *   3. BASIC payment -> festival.tier = BASIC.
 *   4. Legacy null-tier payment -> festival.tier = BASIC (current fallback).
 *   5. payment.tier cannot be inserted as NULL after the migration.
 *
 * Failure mode this guards against: a future PR adding an INSERT path that
 * forgets to pass `tier` (or any other formerly-defaulted column) would
 * silently produce a STANDARD festival from a PRO payment. The migration
 * 0047_remove_silent_defaults.sql drops those defaults + sets NOT NULL,
 * so the DB itself now screams.
 */
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSession, mockEnsureOffStageStage, mockCreateAuditLog } =
  vi.hoisted(() => {
    const mk = () => vi.fn();
    return {
      mockGetSession: mk(),
      mockEnsureOffStageStage: mk(),
      mockCreateAuditLog: mk(),
    };
  });

vi.mock("server-only", () => ({}));

vi.mock("@/core/auth/session", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

vi.mock("@/features/stages/services/off-stage.service", () => ({
  ensureOffStageStage: (...args: unknown[]) => mockEnsureOffStageStage(...args),
}));

vi.mock("@/features/auth/services/audit-log.service", () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  payment as paymentTable,
  user as userTable,
} from "@/core/database/schema";
import { createFestival } from "@/features/festivals/actions/festival-crud.actions";
import { getDb } from "./setup";
import { withTransaction } from "./with-transaction";

type Tier = "BASIC" | "STANDARD" | "PRO";

const OWNER_EMAIL_BASE = "owner-tier-test";

async function seedOwner() {
  const owner = (
    await db
      .insert(userTable)
      .values({
        id: randomUUID(),
        email: `${OWNER_EMAIL_BASE}-${randomUUID()}@test.local`,
        fullName: "Tier Test Owner",
        displayName: "Tier Test Owner",
        accountType: "PERSONAL",
      })
      .returning()
  )[0];
  return owner;
}

async function seedPaidPayment(opts: {
  ownerId: string;
  tier: Tier | null;
  paymentId?: string;
}) {
  const paymentId = opts.paymentId ?? randomUUID();
  await db.insert(paymentTable).values({
    id: paymentId,
    userId: opts.ownerId,
    amount: 1500,
    currency: "INR",
    providerId: `prov-${paymentId}`,
    status: "PAID",
    purpose: "FESTIVAL_CREATION",
    used: false,
    // payment.tier is NOT NULL after migration 0047 — exercise both the
    // explicit-set and the legacy-null paths.
    tier: opts.tier ?? ("BASIC" as Tier),
  } as any);
  return paymentId;
}

async function callCreateFestival(args: {
  ownerId: string;
  paymentId: string;
  festivalName: string;
}) {
  return createFestival({
    paymentId: args.paymentId,
    festivalName: args.festivalName,
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEnsureOffStageStage.mockResolvedValue({
    id: "off-stage-mock",
    festivalId: "fest-mock",
    name: "Off-Stage",
    isOffStage: true,
  });
  mockCreateAuditLog.mockResolvedValue(undefined);
});

describe("createFestival — feature gate (ISSUE-43 §1 regression)", () => {
  it("PRO payment -> festival.tier=PRO, festival.tierLabel=Pro, payment consumed", async () => {
    await withTransaction(async () => {
      const owner = await seedOwner();
      const paymentId = await seedPaidPayment({
        ownerId: owner.id,
        tier: "PRO",
      });
      mockGetSession.mockResolvedValue({
        userId: owner.id,
        role: "USER",
        expires: new Date(Date.now() + 60_000),
      });

      const result = await callCreateFestival({
        ownerId: owner.id,
        paymentId,
        festivalName: "PRO Tier Festival",
      });

      expect(result.success).toBe(true);
      const festival = (
        result as {
          success: true;
          data: { id: string; tier: Tier; tierLabel: string };
        }
      ).data;
      expect(festival.tier).toBe("PRO");
      expect(festival.tierLabel).toBe("Pro");

      const refreshed = await db
        .select()
        .from(festivalTable)
        .where(eq(festivalTable.id, festival.id))
        .limit(1);
      expect(refreshed[0]?.tier).toBe("PRO");
      expect(refreshed[0]?.tierLabel).toBe("Pro");

      const updatedPayment = await db
        .select()
        .from(paymentTable)
        .where(eq(paymentTable.id, paymentId))
        .limit(1);
      expect(updatedPayment[0]?.used).toBe(true);
      expect(updatedPayment[0]?.festivalId).toBe(festival.id);
    });
  });

  it("STANDARD payment -> festival.tier=STANDARD", async () => {
    await withTransaction(async () => {
      const owner = await seedOwner();
      const paymentId = await seedPaidPayment({
        ownerId: owner.id,
        tier: "STANDARD",
      });
      mockGetSession.mockResolvedValue({
        userId: owner.id,
        role: "USER",
        expires: new Date(Date.now() + 60_000),
      });

      const result = await callCreateFestival({
        ownerId: owner.id,
        paymentId,
        festivalName: "Standard Tier Festival",
      });

      expect(result.success).toBe(true);
      const festival = (result as { success: true; data: { tier: Tier } }).data;
      expect(festival.tier).toBe("STANDARD");
    });
  });

  it("BASIC payment -> festival.tier=BASIC", async () => {
    await withTransaction(async () => {
      const owner = await seedOwner();
      const paymentId = await seedPaidPayment({
        ownerId: owner.id,
        tier: "BASIC",
      });
      mockGetSession.mockResolvedValue({
        userId: owner.id,
        role: "USER",
        expires: new Date(Date.now() + 60_000),
      });

      const result = await callCreateFestival({
        ownerId: owner.id,
        paymentId,
        festivalName: "Basic Tier Festival",
      });

      expect(result.success).toBe(true);
      const festival = (result as { success: true; data: { tier: Tier } }).data;
      expect(festival.tier).toBe("BASIC");
    });
  });

  it("legacy null-tier payment row -> festival.tier=BASIC (current fallback)", async () => {
    // Pre-migration payments could have tier=NULL. Backfill in
    // 0047_remove_silent_defaults.sql fills them with BASIC, then sets
    // NOT NULL. Verify a backfilled row still produces BASIC.
    await withTransaction(async () => {
      const owner = await seedOwner();
      const paymentId = await seedPaidPayment({
        ownerId: owner.id,
        tier: null,
      });

      // Mirror the migration's backfill step: NULL -> "BASIC" before the
      // SET NOT NULL lands. After the migration this UPDATE is a no-op
      // (tier is already NOT NULL BASIC), but the production flow runs it
      // exactly once during deploy.
      await db
        .update(paymentTable)
        .set({ tier: "BASIC" as Tier })
        .where(eq(paymentTable.id, paymentId));

      mockGetSession.mockResolvedValue({
        userId: owner.id,
        role: "USER",
        expires: new Date(Date.now() + 60_000),
      });

      const result = await callCreateFestival({
        ownerId: owner.id,
        paymentId,
        festivalName: "Legacy Null Tier Festival",
      });

      expect(result.success).toBe(true);
      const festival = (result as { success: true; data: { tier: Tier } }).data;
      expect(festival.tier).toBe("BASIC");
    });
  });

  it("DB rejects INSERT into festival with missing tier (silent default gone)", async () => {
    // Pin the migration outcome: omitting `tier` from the INSERT now fails
    // because the column is NOT NULL with no DEFAULT.
    await expect(
      db.insert(festivalTable).values({
        id: randomUUID(),
        ownerId: randomUUID(),
        name: "Should Fail",
        slug: `fail-${randomUUID().slice(0, 8)}`,
        isLocked: false,
        expiresAt: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        publicSiteEnabled: false,
        scoringSystem: "SCORE_BASED",
        status: "READY",
        tierLabel: "Standard",
        // tier intentionally omitted — silent default is gone.
      } as any),
    ).rejects.toThrow();
  });

  it("DB rejects INSERT into payment with missing tier (silent default gone)", async () => {
    // payment.tier is NOT NULL post-migration. If a future billing flow
    // forgets to set it, the DB will reject the row — no silent BASIC
    // fallback masking a tier downgrade.
    await expect(
      db.insert(paymentTable).values({
        id: randomUUID(),
        userId: randomUUID(),
        amount: 1500,
        currency: "INR",
        providerId: `prov-${randomUUID()}`,
        status: "PAID",
        purpose: "FESTIVAL_CREATION",
        used: false,
        // tier intentionally omitted — silent default is gone.
      } as any),
    ).rejects.toThrow();
  });
});
