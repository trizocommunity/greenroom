import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { FestivalController } from "@/server/controllers/festival.controller";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const festivals = await FestivalController.index(
      session.userId,
      session.role,
    );
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
    const festival = await FestivalController.store(
      session.userId,
      session.role,
      body,
    );

    return NextResponse.json(festival, { status: 201 });
  } catch (error) {
    console.error("[FESTIVALS_POST]", error);
    const message = error instanceof Error ? error.message : "Internal Error";
    // Simple error mapping for now
    if (
      message === "Start a subscription to create a festival" ||
      message === "Standard users can only manage one festival"
    ) {
      return new NextResponse(message, { status: 403 });
    }
    return new NextResponse(message, { status: 400 });
  }
}
