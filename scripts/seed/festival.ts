import { eq } from "drizzle-orm";
import { generateId } from "../../src/core/database/ids";
import * as schema from "../../src/core/database/schema";
import { expiresAt, FESTIVAL, FESTIVAL_MEMBERS } from "./config";
import type { DB } from "./db";
import { getOrCreateUser } from "./users";

export async function createFestival(
  db: DB,
  ownerId: string,
  institutionId: string,
): Promise<string> {
  const now = new Date().toISOString();
  const festivalId = generateId();

  const existing = await db.query.festival.findFirst({
    where: (f, { eq }) => eq(f.slug, FESTIVAL.slug),
  });

  if (existing) {
    console.log(
      `♻️  Existing Festival '${existing.name}' found. Removing previous data to seed cleanly...`,
    );
    await db.delete(schema.festival).where(eq(schema.festival.id, existing.id));
  }

  await db.insert(schema.festival).values({
    id: festivalId,
    ownerId,
    institutionId,
    festivalType: "INSTITUTIONAL",
    name: FESTIVAL.name,
    slug: FESTIVAL.slug,
    category: FESTIVAL.category,
    description: FESTIVAL.description,
    orgName: FESTIVAL.orgName,
    orgLocation: FESTIVAL.orgLocation,
    tier: FESTIVAL.tier,
    tierLabel: FESTIVAL.tierLabel,
    status: FESTIVAL.status,
    scoringSystem: FESTIVAL.scoringSystem,
    isLocked: false,
    startDate: FESTIVAL.startDate,
    endDate: FESTIVAL.endDate,
    expiresAt: expiresAt(FESTIVAL.startDate),
    chestNumberSettings: FESTIVAL.chestNumberSettings,
    createdAt: now,
    updatedAt: now,
  });

  console.log("👑 Created Pro Tier Festival with start & end dates.");
  return festivalId;
}

export async function recordProPayment(
  db: DB,
  festivalId: string,
  userId: string,
): Promise<void> {
  const existing = await db.query.payment.findFirst({
    where: (p, { eq }) => eq(p.providerId, "SEED_PAYMENT"),
  });
  if (existing) return;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  await db.insert(schema.payment).values({
    id: generateId(),
    amount: FESTIVAL.payment.amount,
    currency: FESTIVAL.payment.currency,
    providerId: "SEED_PAYMENT",
    userId,
    festivalId,
    purpose: "FESTIVAL_CREATION",
    status: "PAID",
    used: false,
    validUntil: validUntil.toISOString(),
    tier: FESTIVAL.tier,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function upsertPurchaseSummary(
  db: DB,
  userId: string,
  festivalId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db.query.userPurchaseSummary.findFirst({
    where: (s, { eq }) => eq(s.userId, userId),
  });

  if (existing) {
    await db
      .update(schema.userPurchaseSummary)
      .set({
        totalSpend: existing.totalSpend + FESTIVAL.payment.amount,
        festivalsCount: existing.festivalsCount + 1,
        festivalIds: [
          ...((existing.festivalIds as string[]) || []),
          festivalId,
        ],
        planCountsByTier: {
          ...((existing.planCountsByTier as Record<string, number>) || {}),
          PRO:
            ((existing.planCountsByTier as Record<string, number>)?.PRO || 0) +
            1,
        },
        lastPurchaseAt: now,
        updatedAt: now,
      })
      .where(eq(schema.userPurchaseSummary.userId, userId));
  } else {
    await db.insert(schema.userPurchaseSummary).values({
      userId,
      totalSpend: FESTIVAL.payment.amount,
      festivalsCount: 1,
      festivalIds: [festivalId],
      planCountsByTier: { PRO: 1 },
      lastPurchaseAt: now,
      updatedAt: now,
    });
  }
}

export async function addFestivalMembers(
  db: DB,
  festivalId: string,
  ownerId: string,
): Promise<void> {
  const now = new Date().toISOString();

  await db.insert(schema.festivalMember).values({
    id: generateId(),
    festivalId,
    userId: ownerId,
    role: "ADMIN",
    isActive: true,
    metadata: {},
    createdAt: now,
    updatedAt: now,
  });

  for (const acc of FESTIVAL_MEMBERS) {
    const userId = await getOrCreateUser(db, acc.email, acc.name, "USER");
    await db.insert(schema.festivalMember).values({
      id: generateId(),
      festivalId,
      userId,
      role: acc.role,
      isActive: true,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
  }
}
