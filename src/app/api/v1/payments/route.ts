import "server-only";

import { desc } from "drizzle-orm";
import { initiatePaymentInput } from "@/api/contracts/payments";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import { payment } from "@/core/database/schema";
import {
  getUserStatusDomain,
  initiatePaymentDomain,
} from "@/features/payments/services/payments-domain.service";

const handler = createProtectedHandler({
  async GET({ user }) {
    const status = await getUserStatusDomain(user!.userId, user!.role);

    const payments = await db.query.payment.findMany({
      where: (p, { eq }) => eq(p.userId, user!.userId),
      orderBy: [desc(payment.createdAt)],
      with: { festival: { columns: { name: true, slug: true } } },
    });

    return ok(
      {
        status,
        history: payments.map((p) => ({
          ...p,
          razorpayOrderId: p.providerId,
          razorpayId: p.providerId,
        })),
      },
      "private, max-age=10",
    );
  },

  async POST({ user, request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = initiatePaymentInput.safeParse(data);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const result = await initiatePaymentDomain({
      userId: user!.userId,
      purpose: "FESTIVAL_CREATION",
      tier: parsed.data.tier,
    });

    return ok(result);
  },
});

export const GET = handler;
export const POST = handler;
