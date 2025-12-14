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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const festival = await prisma.festival.findUnique({
      where: { id },
    });

    if (!festival) {
      return new NextResponse("Festival not found", { status: 404 });
    }

    // Ensure user owns this festival
    if (festival.creatorId !== session.userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    return NextResponse.json({
      ...festival,
      status: computeStatus(festival.startDate, festival.endDate),
    });
  } catch (error) {
    console.error("[FESTIVAL_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check ownership
    const existing = await prisma.festival.findUnique({
      where: { id },
    });

    if (!existing) {
      return new NextResponse("Festival not found", { status: 404 });
    }

    if (existing.creatorId !== session.userId) {
      return new NextResponse("Forbidden", { status: 403 });
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
    } = body;

    // If slug is being updated, validate it
    if (slug && slug !== existing.slug) {
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return new NextResponse("Invalid slug format", { status: 400 });
      }

      const slugTaken = await prisma.festival.findFirst({
        where: { 
          slug,
          NOT: { id } // Exclude current festival
        },
      });

      if (slugTaken) {
        return new NextResponse("This URL slug is already taken", { status: 400 });
      }
    }

    const start = startDate ? new Date(startDate) : existing.startDate;
    const end = endDate ? new Date(endDate) : existing.endDate;

    if (end < start) {
      return new NextResponse("End date must be after start date", { status: 400 });
    }

    const status = computeStatus(start, end);

    const festival = await prisma.festival.update({
      where: { id },
      data: {
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
      },
    });

    return NextResponse.json(festival);
  } catch (error) {
    console.error("[FESTIVAL_PATCH]", error);
    return new NextResponse(`Internal Error: ${(error as Error).message}`, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    // Check ownership
    const existing = await prisma.festival.findUnique({
      where: { id },
    });

    if (!existing) {
      return new NextResponse("Festival not found", { status: 404 });
    }

    if (existing.creatorId !== session.userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await prisma.festival.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[FESTIVAL_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
