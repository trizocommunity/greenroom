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

  // Helper for slugify available here or duplicated?
  // Let's implement slugify inline or hoist it.
  const slug = name
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");

  try {
    const edition = await createEdition({
      festival: { connect: { id: festivalId } },
      name,
      slug,
      number: year, // Mapping input 'year' to 'number' for now, assuming input name hasn't changed
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      // paymentId REMOVED
      status: "ACTIVE", // Defaulting to ACTIVE for UX testing
    });

    // Fetch festival to get slug for redirect
    const festival = await import("@/server/models/festival.model").then(
      (mod) => mod.findFestivalById(festivalId),
    );
    const festivalSlug = festival?.slug || festivalId;

    revalidatePath(`/festival/${festivalSlug}/dashboard`);
    redirect(`/festival/${festivalSlug}/${edition.slug}`);
  } catch (error) {
    console.error("Failed to create edition:", error);
    // If we already redirected, this catch won't catch it (NEXT_REDIRECT)
    // But safely handling error
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    return { error: "Failed to create edition. Year might be duplicate." };
  }
}

const updateEditionSchema = z.object({
  id: z.string().min(1, "Edition ID is required"),
  festivalId: z.string().min(1, "Festival ID is required"),
  name: z.string().min(1, "Name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  description: z.string().optional(),
  theme: z.string().optional(),
  venue: z.string().optional(),
  location: z.string().optional(),
});

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-"); // Replace multiple - with single -
}

export async function updateEditionAction(formData: FormData) {
  const rawData = {
    id: formData.get("id"),
    festivalId: formData.get("festivalId"),
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    description: formData.get("description"),
    theme: formData.get("theme"),
    venue: formData.get("venue"),
    location: formData.get("location"),
  };

  const validated = updateEditionSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const {
    id,
    festivalId,
    name,
    startDate,
    endDate,
    description,
    theme,
    venue,
    location,
  } = validated.data;

  try {
    // Generate new slug from name
    // We might want to append random string if collision, but for now simple slugify
    // Ideally we check for uniqueness but Prisma unique constraint will throw if duplicate.
    // User asked "for change edition details like name ,, it need new params, so make sense"
    // Implicitly: Update Slug to match Name.
    const newSlug = slugify(name);

    const updatedEdition = await import("@/server/models/edition.model").then(
      (mod) =>
        mod.updateEdition(id, {
          name,
          slug: newSlug,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          description: description || undefined,
          theme: theme || undefined,
          venue: venue || undefined,
          location: location || undefined,
        }),
    );

    const festival = await import("@/server/models/festival.model").then(
      (mod) => mod.findFestivalById(festivalId),
    );
    const festivalSlug = festival?.slug || festivalId;

    revalidatePath(`/festival/${festivalSlug}/${updatedEdition.slug}`);
    revalidatePath(`/festival/${festivalSlug}/dashboard`);

    // If slug changed, we need to communicate that to the client to redirect
    // We can't redirect easily from server action called by a form without full page reload or client handling.
    // We'll return the new slug and let Client Component handle navigation.
    return { success: true, newSlug: updatedEdition.slug };
  } catch (error: any) {
    console.error("Failed to update edition:", error);
    if (error.code === "P2002") {
      // Prisma unique constraint violation
      return { error: "An edition with this name/slug already exists." };
    }
    return { error: "Failed to update edition." };
  }
}
