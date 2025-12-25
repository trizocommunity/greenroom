"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createEditionAction(_formData: FormData) {
  return {
    error:
      "Edition creation via this method is disabled. Please use the payment flow.",
  };
}

const updateEditionSchema = z.object({
  id: z.string().min(1, "Edition ID is required"),
  festivalId: z.string().min(1, "Festival ID is required"),
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  description: z.string().optional(),
  theme: z.string().optional(),
  venue: z.string().optional(),
  location: z.string().optional(),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove all non-word chars except spaces and hyphens
    .replace(/[\s_-]+/g, "-") // Replace spaces, underscores, and multiple hyphens with a single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

export async function updateEditionAction(formData: FormData) {
  const rawData = {
    id: formData.get("id"),
    festivalId: formData.get("festivalId"),
    name: formData.get("name"),
    slug: formData.get("slug"), // Capture slug from form
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
    slug,
    startDate,
    endDate,
    description,
    theme,
    venue,
    location,
  } = validated.data;

  // 1. Guard: Check if edition exists and is ACTIVE
  const existingEdition = await import("@/server/models/edition.model").then(
    (mod) => mod.findEditionById(id),
  );

  if (!existingEdition) {
    return { error: "Edition not found" };
  }

  if (existingEdition.status !== "ACTIVE") {
    return { error: "Cannot modify a frozen or archived edition." };
  }

  try {
    // Check if a DIFFERENT edition already has this slug within the same festival
    // Note: Prisma unique constraint is usually global or composite.
    // If Festival + Slug is unique, we are safe.

    // Explicit slug takes precedence, otherwise re-slugify name
    const finalSlug = slug ? slugify(slug) : slugify(name);

    const updatedEdition = await import("@/server/models/edition.model").then(
      (mod) =>
        mod.updateEdition(id, {
          name,
          slug: finalSlug,
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
    revalidatePath(`/festival/${festivalSlug}`);

    // If slug changed, we need to communicate that to the client to redirect
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
