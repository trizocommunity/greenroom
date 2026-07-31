import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/core/database/client";
import { payment } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";

export type PaymentPurpose = "FESTIVAL_CREATION";

export async function getUnusedPayment(
  userId: string,
  purpose?: PaymentPurpose,
) {
  return db.query.payment.findFirst({
    where: and(
      eq(payment.userId, userId),
      eq(payment.status, "PAID"),
      eq(payment.used, false),
      purpose ? eq(payment.purpose, purpose) : undefined,
      gt(payment.validUntil, serverNowIso()),
    ),
    orderBy: [asc(payment.createdAt)],
  });
}

async function consumePayment(
  paymentId: string,
  metadata: { festivalId?: string } = {},
) {
  const result = await db
    .update(payment)
    .set({
      used: true,
      festivalId: metadata.festivalId,
    })
    .where(and(eq(payment.id, paymentId), eq(payment.used, false)))
    .returning();
  return result[0];
}
