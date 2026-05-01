"use server";

import { revalidatePath } from "next/cache";
import { TIER_CONFIG } from "@/config/pricing";
import { getSession } from "@/core/auth/session";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import type { Tier } from "@/core/types/app-enums";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import {
  initiatePaymentDomain,
  verifyPaymentDomain,
} from "@/features/payments/services/payments-domain.service";

export async function initiateFestivalPayment(tier: Tier): Promise<
  ActionResponse<{
    paymentId: string;
    orderId: string;
    amount: number;
    currency: string;
    key: string | undefined;
  }>
> {
  try {
    const session = await getSession();
    if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    const config = TIER_CONFIG[tier];
    if (!config) throw new AppError(ERROR_MESSAGES.TIER_NOT_FOUND);

    const data = await initiatePaymentDomain({
      userId: session.userId,
      purpose: "FESTIVAL_CREATION",
      tier,
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function verifyFestivalPayment(
  paymentId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<ActionResponse<{ paymentId: string }>> {
  try {
    const session = await getSession();
    if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

    const status = await verifyPaymentDomain(
      paymentId,
      razorpayPaymentId,
      razorpaySignature,
    );

    if (status !== "PAID") {
      throw new AppError(ERROR_MESSAGES.PAYMENT_SIGNATURE_INVALID);
    }

    await createAuditLog({
      action: "PAYMENT_SUCCESS",
      targetType: "PAYMENT",
      targetId: paymentId,
      metadata: {
        source: "verifyFestivalPayment",
      },
    });

    revalidatePath("/profile");
    return { success: true, data: { paymentId } };
  } catch (error) {
    return handleActionError(error);
  }
}
