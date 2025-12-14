import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { FestivalStatus } from "@prisma/client";

// Helper to compute status based on dates
function computeStatus(startDate: Date, endDate: Date): FestivalStatus {
  const now = new Date();
  if (now < startDate) return "UPCOMING";
  if (now > endDate) return "COMPLETED";
  return "ONGOING";
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const festivals = await prisma.festival.findMany({
      where: {
        creatorId: session.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Update status based on current date
    const festivalsWithStatus = festivals.map((festival) => ({
      ...festival,
      status: computeStatus(festival.startDate, festival.endDate),
    }));

    return NextResponse.json(festivalsWithStatus);
  } catch (error) {
    console.error("[FESTIVALS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const {
      name,
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
    if (!name || !startDate || !endDate || !location || !orgName) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return new NextResponse("End date must be after start date", { status: 400 });
    }

    const status = computeStatus(start, end);

    const festival = await prisma.festival.create({
      data: {
        name,
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
        creatorId: session.userId,
      },
    });

    return NextResponse.json(festival, { status: 201 });
  } catch (error) {
    console.error("[FESTIVALS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
