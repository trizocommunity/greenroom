import type { FestivalStatus } from "@prisma/client";
import {
  createFestival,
  deleteFestival,
  findAllFestivals,
  findFestivalById,
  updateFestival,
} from "@/server/models/festival.model";

export async function index(userId: string, role: string) {
  const where = role === "SUPER_ADMIN" ? {} : { ownerId: userId };
  const festivals = await findAllFestivals(where);

  // Map to Frontend interface
  return festivals.map((f: any) => {
    // Get latest edition or default
    const latestEdition = f.editions?.[0]; // Assuming order is irrelevant or sort by latest in model? default sort was createdAt desc.

    // Default dates if no edition
    const now = new Date();
    const startDate = latestEdition?.startsAt
      ? new Date(latestEdition.startsAt)
      : new Date(now.setDate(now.getDate() + 30));
    const endDate = latestEdition?.endsAt
      ? new Date(latestEdition.endsAt)
      : new Date(now.setDate(now.getDate() + 3));

    // Compute Status
    let status = "UPCOMING";
    const today = new Date();
    if (endDate < today) {
      status = "COMPLETED";
    } else if (startDate <= today && endDate >= today) {
      status = "ONGOING";
    }

    return {
      ...f,
      status, // Overwrite DB status (DRAFT/ACTIVE) with Frontend Computed Status
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      location: "Bengaluru, India", // Placeholder as removed from schema
      // Add other missing fields if necessary
      description: f.description || "",
      orgName: f.owner?.fullName || "Organization",
      orgDescription: "",
      orgWebsite: "",
      orgLocation: "",
      orgEstablishedYear: null,
    };
  });
}

export async function store(userId: string, role: string, data: any) {
  // Phase 1 Schema: name, ownerId, status
  // Data might contain other fields from UI form, ignore them or map them if schema allows.
  // Ignoring slug, dates, validation for now to fix build.

  const { name } = data;

  if (!name) {
    throw new Error("Missing required fields");
  }

  // Check limit for USER
  if (role === "USER") {
    const userFestivals = await findAllFestivals({ ownerId: userId });
    if (userFestivals.length > 0) {
      throw new Error("Standard users can only manage one festival");
    }
  }

  const festival = await createFestival({
    name,
    owner: { connect: { id: userId } },
    status: "DRAFT", // Default to DRAFT
  });

  return festival;
}

export async function show(id: string, userId: string, role: string) {
  const festival = await findFestivalById(id);

  if (!festival) {
    throw new Error("Festival not found");
  }

  if (festival.ownerId !== userId && role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }

  return festival;
}

export async function update(
  id: string,
  userId: string,
  role: string,
  data: any,
) {
  const existing = await findFestivalById(id);
  if (!existing) {
    throw new Error("Festival not found");
  }

  if (existing.ownerId !== userId && role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }

  const { name } = data;

  const festival = await updateFestival(id, {
    name: name ?? existing.name,
  });

  return festival;
}

export async function destroy(id: string, userId: string, role: string) {
  const existing = await findFestivalById(id);
  if (!existing) {
    throw new Error("Festival not found");
  }

  if (existing.ownerId !== userId && role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }

  await deleteFestival(id);
}
