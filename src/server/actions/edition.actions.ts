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
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function updateEditionAction(formData: FormData) {
  const rawData = {
    id: formData.get("id"),
    festivalId: formData.get("festivalId"),
    // name removed
    slug: formData.get("slug"),
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
    // name,
    slug,
    startDate,
    endDate,
    description,
    theme,
    venue,
    location,
  } = validated.data;

  // 1. Guard: Check if edition exists and is ACTIVE
  // Use db import or make sure models/edition.model is used correctly
  // Assuming findEditionById is a valid function in models
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
    const finalSlug = slugify(slug);

    const existingSlugEdition = await import("@/lib/db").then((mod) =>
      mod.prisma.edition.findFirst({
        where: {
          festivalId: festivalId,
          slug: finalSlug,
          NOT: {
            id: id,
          },
        },
      }),
    );

    if (existingSlugEdition) {
      return {
        error: "An edition with this slug already exists for this festival.",
      };
    }

    const updatedEdition = await import("@/server/models/edition.model").then(
      (mod) =>
        mod.updateEdition(id, {
          // name: undefined, // remove name update
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

    return { success: true, newSlug: updatedEdition.slug };
  } catch (error: any) {
    console.error("Failed to update edition:", error);
    return { error: "Failed to update edition." };
  }
}
