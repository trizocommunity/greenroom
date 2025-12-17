import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  findAllFestivals,
  findFestivalById,
  createFestival,
  updateFestival,
  deleteFestival,
  isFestivalSlugTaken
} from "@/models/FestivalModel";
import { FestivalStatus } from "@prisma/client";

// Helper to compute status based on dates
function computeStatus(startDate: Date, endDate: Date): FestivalStatus {
  const now = new Date();
  if (now < startDate) return "UPCOMING";
  if (now > endDate) return "COMPLETED";
  return "ONGOING";
}

export class FestivalController {
  
  // GET /api/festivals
  static async index() {
    try {
      const session = await getSession();
      if (!session?.userId) {
        return new NextResponse("Unauthorized", { status: 401 });
      }

      const where = session.role === "SUPER_ADMIN" ? {} : { creatorId: session.userId };
      const festivals = await findAllFestivals(where);

      // Update status dynamically (business logic)
      const festivalsWithStatus = festivals.map((festival) => ({
        ...festival,
        status: computeStatus(festival.startDate, festival.endDate),
      }));

      return NextResponse.json(festivalsWithStatus);
    } catch (error) {
      console.error("[FESTIVAL_CONTROLLER_INDEX]", error);
      return new NextResponse("Internal Error", { status: 500 });
    }
  }

  // POST /api/festivals
  static async store(request: Request) {
    try {
      const session = await getSession();
      if (!session?.userId) {
        return new NextResponse("Unauthorized", { status: 401 });
      }

      const body = await request.json();
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
      } = body;

      // Validation
      if (!name || !slug || !startDate || !endDate || !location || !orgName) {
        return new NextResponse("Missing required fields", { status: 400 });
      }

      if (!/^[a-z0-9-]+$/.test(slug)) {
        return new NextResponse("Invalid slug format", { status: 400 });
      }

      const isTaken = await isFestivalSlugTaken(slug);
      if (isTaken) {
        return new NextResponse("This URL slug is already taken", { status: 400 });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end < start) {
        return new NextResponse("End date must be after start date", { status: 400 });
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
        orgEstablishedYear: orgEstablishedYear ? parseInt(orgEstablishedYear) : null,
        creator: { connect: { id: session.userId } },
      });

      return NextResponse.json(festival, { status: 201 });
    } catch (error) {
      console.error("[FESTIVAL_CONTROLLER_STORE]", error);
      return new NextResponse("Internal Error", { status: 500 });
    }
  }

  // GET /api/festivals/[id]
  static async show(id: string) {
    try {
      const session = await getSession();
      if (!session?.userId) {
        return new NextResponse("Unauthorized", { status: 401 });
      }

      const festival = await findFestivalById(id);

      if (!festival) {
        return new NextResponse("Festival not found", { status: 404 });
      }

      if (festival.creatorId !== session.userId && session.role !== 'SUPER_ADMIN') {
        return new NextResponse("Forbidden", { status: 403 });
      }

      return NextResponse.json({
        ...festival,
        status: computeStatus(festival.startDate, festival.endDate),
      });
    } catch (error) {
       console.error("[FESTIVAL_CONTROLLER_SHOW]", error);
       return new NextResponse("Internal Error", { status: 500 });
    }
  }

  // PATCH /api/festivals/[id]
  static async update(request: Request, id: string) {
    try {
      const session = await getSession();
      if (!session?.userId) {
        return new NextResponse("Unauthorized", { status: 401 });
      }

      const existing = await findFestivalById(id);
      if (!existing) {
        return new NextResponse("Festival not found", { status: 404 });
      }

      if (existing.creatorId !== session.userId && session.role !== 'SUPER_ADMIN') {
        return new NextResponse("Forbidden", { status: 403 });
      }

      const body = await request.json();
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
      } = body;

      if (slug && slug !== existing.slug) {
        if (!/^[a-z0-9-]+$/.test(slug)) {
          return new NextResponse("Invalid slug format", { status: 400 });
        }
        const isTaken = await isFestivalSlugTaken(slug, id);
        if (isTaken) {
           return new NextResponse("This URL slug is already taken", { status: 400 });
        }
      }

      const start = startDate ? new Date(startDate) : existing.startDate;
      const end = endDate ? new Date(endDate) : existing.endDate;

      if (end < start) {
        return new NextResponse("End date must be after start date", { status: 400 });
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

      return NextResponse.json(festival);
    } catch (error) {
      console.error("[FESTIVAL_CONTROLLER_UPDATE]", error);
      return new NextResponse(`Internal Error: ${(error as Error).message}`, { status: 500 });
    }
  }

  // DELETE /api/festivals/[id]
  static async destroy(id: string) {
     try {
      const session = await getSession();
      if (!session?.userId) {
        return new NextResponse("Unauthorized", { status: 401 });
      }

      const existing = await findFestivalById(id);
      if (!existing) {
        return new NextResponse("Festival not found", { status: 404 });
      }

      if (existing.creatorId !== session.userId && session.role !== 'SUPER_ADMIN') {
        return new NextResponse("Forbidden", { status: 403 });
      }

      await deleteFestival(id);

      return new NextResponse(null, { status: 200 });

     } catch (error) {
       console.error("[FESTIVAL_CONTROLLER_DESTROY]", error);
       return new NextResponse("Internal Error", { status: 500 });
     }
  }
}
