import type { FestivalStatus } from "@prisma/client";
import * as PaymentController from "@/server/controllers/payment.controller"; // To check payment
import {
  createFestival,
  deleteFestival,
  findAllFestivals,
  findFestivalById,
  isFestivalSlugTaken,
  updateFestival,
} from "@/server/models/festival.model";

// Helper to compute status based on dates
function computeStatus(startDate: Date, endDate: Date): FestivalStatus {
  const now = new Date();
  if (now < startDate) return "UPCOMING";
  if (now > endDate) return "COMPLETED";
  return "ONGOING";
}

export async function index(userId: string, role: string) {
  const where = role === "SUPER_ADMIN" ? {} : { creatorId: userId };
  const festivals = await findAllFestivals(where);

  // Business Logic: Compute status
  return festivals.map((festival) => ({
    ...festival,
    status: computeStatus(festival.startDate, festival.endDate),
  }));
}

export async function store(userId: string, role: string, data: any) {
  // 1. Business Rule: Check Payment & Limits
  // "If user.role === USER AND user already has an active festival -> deny creation"
  if (role === "USER") {
    const paymentStatus = await PaymentController.getUserStatus(userId);
    if (!paymentStatus.canCreateFestival) {
      throw new Error("Start a subscription to create a festival");
    }

    const userFestivals = await findAllFestivals({ creatorId: userId });
    if (userFestivals.length > 0) {
      throw new Error("Standard users can only manage one festival");
    }
  }

  const {
    name,
    slug,
    description,
    startDate,
    endDate,
    location,
    orgName,
    orgDescription,
    orgWebsite,
    orgLocation,
    orgEstablishedYear,
  } = data;

  // Validation
  if (!name || !slug || !startDate || !endDate || !location || !orgName) {
    throw new Error("Missing required fields");
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("Invalid slug format");
  }

  const isTaken = await isFestivalSlugTaken(slug);
  if (isTaken) {
    throw new Error("This URL slug is already taken");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    throw new Error("End date must be after start date");
  }

  const status = computeStatus(start, end);

  const festival = await createFestival({
    name,
    slug,
    description,
    startDate: start,
    endDate: end,
    location,
    status,
    orgName,
    orgDescription,
    orgWebsite,
    orgLocation,
    orgEstablishedYear: orgEstablishedYear
      ? parseInt(orgEstablishedYear)
      : null,
    creator: { connect: { id: userId } },
  });

  return festival;
}

export async function show(id: string, userId: string, role: string) {
  const festival = await findFestivalById(id);

  if (!festival) {
    throw new Error("Festival not found");
  }

  if (festival.creatorId !== userId && role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }

  return {
    ...festival,
    status: computeStatus(festival.startDate, festival.endDate),
  };
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

  if (existing.creatorId !== userId && role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }

  const {
    name,
    slug,
    description,
    startDate,
    endDate,
    location,
    orgName,
    orgDescription,
    orgWebsite,
    orgLocation,
    orgEstablishedYear,
  } = data;

  if (slug && slug !== existing.slug) {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new Error("Invalid slug format");
    }
    const isTaken = await isFestivalSlugTaken(slug, id);
    if (isTaken) {
      throw new Error("This URL slug is already taken");
    }
  }

  const start = startDate ? new Date(startDate) : existing.startDate;
  const end = endDate ? new Date(endDate) : existing.endDate;

  if (end < start) {
    throw new Error("End date must be after start date");
  }

  const status = computeStatus(start, end);

  const festival = await updateFestival(id, {
    name: name ?? existing.name,
    slug: slug ?? existing.slug,
    description: description ?? existing.description,
    startDate: start,
    endDate: end,
    location: location ?? existing.location,
    status,
    orgName: orgName ?? existing.orgName,
    orgDescription: orgDescription ?? existing.orgDescription,
    orgWebsite: orgWebsite ?? existing.orgWebsite,
    orgLocation: orgLocation ?? existing.orgLocation,
    orgEstablishedYear: orgEstablishedYear
      ? parseInt(orgEstablishedYear)
      : existing.orgEstablishedYear,
  });

  return festival;
}

export async function destroy(id: string, userId: string, role: string) {
  const existing = await findFestivalById(id);
  if (!existing) {
    throw new Error("Festival not found");
  }

  if (existing.creatorId !== userId && role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }

  await deleteFestival(id);
}
