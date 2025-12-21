"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createParticipantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  editionId: z.string().min(1, "Edition ID is required"),
});

export async function createParticipantAction(formData: FormData) {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    editionId: formData.get("editionId"),
  };

  const validated = createParticipantSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const { name, email, phone, editionId } = validated.data;

  try {
    // Transaction to enforce limit and atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch Edition count & Limit
      const edition = await tx.edition.findUnique({
        where: { id: editionId },
        include: { limits: true },
      });

      if (!edition) {
        throw new Error("Edition not found");
      }

      if (edition.status !== "ACTIVE") {
        throw new Error("Edition is not active");
      }

      const limit = edition.limits?.maxParticipants || 1000; // Default limit
      const currentCount = edition.participantsCount;

      if (currentCount >= limit) {
        throw new Error("Participant limit reached for this edition.");
      }

      // 2. Create Participant
      // Check for duplicate email in this edition first (though DB unique constraint handles it, nicer error here)
      const existing = await tx.participant.findUnique({
        where: {
          editionId_email: {
            editionId,
            email,
          },
        },
      });

      if (existing) {
        throw new Error("This email is already registered for this edition.");
      }

      await tx.participant.create({
        data: {
          editionId,
          name,
          email,
          phone,
        },
      });

      // 3. Increment Count
      await tx.edition.update({
        where: { id: editionId },
        data: {
          participantsCount: { increment: 1 },
        },
      });

      return { success: true };
    });

    try {
      revalidatePath(`/festival/${editionId}`);
    } catch (e) {
      // Ignore static generation store missing in test environment
    }
    return { success: true };
  } catch (error: any) {
    console.error("Failed to register participant:", error);
    return { error: error.message || "Failed to register participant" };
  }
}

export async function deleteParticipantAction(
  participantId: string,
  editionId: string,
) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.participant.delete({
        where: { id: participantId },
      });

      await tx.edition.update({
        where: { id: editionId },
        data: {
          participantsCount: { decrement: 1 },
        },
      });
    });

    try {
      revalidatePath(`/festival/${editionId}`);
    } catch {}
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete participant" };
  }
}
