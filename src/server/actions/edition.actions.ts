"use server";

import { createEdition } from "@/server/models/edition.model";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const createEditionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  year: z.coerce.number().min(2020, "Year must be valid"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  festivalId: z.string().min(1, "Festival ID is required"),
});

export async function createEditionAction(formData: FormData) {
  const rawData = {
    name: formData.get("name"),
    year: formData.get("year"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    festivalId: formData.get("festivalId"),
  };

  const validated = createEditionSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const { name, year, startDate, endDate, festivalId } = validated.data;

  // TODO: Integrate with real payment flow.
  // For now, generating a manual payment ID to proceed with UX testing.
  const paymentId = `pay_manual_${Date.now()}`;

  try {
    const edition = await createEdition({
      festival: { connect: { id: festivalId } },
      name,
      year,
      startsAt: new Date(startDate),
      endsAt: new Date(endDate),
      paymentId,
      status: "ACTIVE", // Defaulting to ACTIVE for UX testing
    });

    revalidatePath(`/festival/${festivalId}/dashboard`);
  } catch (error) {
    console.error("Failed to create edition:", error);
    return { error: "Failed to create edition. Year might be duplicate." };
  }

  redirect(`/festival/${festivalId}/dashboard/editions`);
}
