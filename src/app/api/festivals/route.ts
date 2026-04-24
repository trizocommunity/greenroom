import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { festival as festivalsTable } from "@/core/database/schema";
import { getSession } from "@/core/auth/session";
import {
  findAllFestivals,
  createFestival,
} from "@/features/festivals/repositories/festival.repository";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const where =
      session.role === "SUPER_ADMIN"
        ? undefined
        : eq(festivalsTable.ownerId, session.userId);

    const festivals = await findAllFestivals(where);
    return NextResponse.json(festivals);
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
    const festival = await createFestival({ ...body, ownerId: session.userId });

    return NextResponse.json(festival, { status: 201 });
  } catch (error) {
    console.error("[FESTIVALS_POST]", error);
    const message = error instanceof Error ? error.message : "Internal Error";
    if (
      message === "Start a subscription to create a festival" ||
      message === "Standard users can only manage one festival"
    ) {
      return new NextResponse(message, { status: 403 });
    }
    return new NextResponse(message, { status: 400 });
  }
}
