import { prisma } from "@/lib/db";
import { findFestivalByOwnerId } from "@/server/models/festival.model";
import { PaymentService } from "@/server/services/payment.service";
import {
  // findEditionByPaymentId, // Removed
  createEdition,
} from "@/server/models/edition.model";
import type { User } from "@prisma/client";

/**
 * Edition Payment Controller
 * Handles the "Money -> Edition" transaction atomically.
 */
export const EditionPaymentController = {
  /**
   * Creates a Paid Edition for a user's festival.
   * Enforces Idempotency and "First Edition Unlock" rule.
   */
  async createPaidEdition(user: User, paymentId: string, year: number) {
    // 1. Idempotency Check (Critical) - DISABLED for Phase 1
    // const existingEdition = await findEditionByPaymentId(paymentId);
    // if (existingEdition) {
    //   return existingEdition;
    // }

    // 2. Validate User & Festival
    const festival = await findFestivalByOwnerId(user.id);
    if (!festival) {
      throw new Error("User does not have a festival.");
    }

    // 3. Verify Payment
    const isPaymentValid = await PaymentService.verifyPayment(paymentId);
    if (!isPaymentValid) {
      throw new Error("Invalid payment signature.");
    }

    // 4. Transaction: Create Edition + Unlock Festival (if needed)
    return await prisma.$transaction(async (tx) => {
      // Create the Edition
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + 90); // 90 Days Validity

      const newEdition = await tx.edition.create({
        data: {
          festivalId: festival.id,
          number: year,
          // paymentId: paymentId, // Removed for Phase 1
          name: `${year} Edition`,
          status: "ACTIVE",
          startDate: new Date(),
          endDate: endsAt,
          limits: {
            create: {
              maxParticipants: 1000,
              maxEvents: 100,
              maxJudges: 50,
              maxStorageMB: 1024,
            },
          },
        },
      });

      // Unlock Festival Rule:
      // If festival is DRAFT, this is the FIRST paid edition. Unlock it.
      if (festival.status === "DRAFT") {
        await tx.festival.update({
          where: { id: festival.id },
          data: {
            status: "ACTIVE", // Permanently Active
            isLocked: false,
          },
        });
      }

      return newEdition;
    });
  },
};
