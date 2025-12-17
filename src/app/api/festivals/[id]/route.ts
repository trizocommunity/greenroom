import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { FestivalController } from "@/server/controllers/festival.controller";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { id } = await params;
    const festival = await FestivalController.show(
      id,
      session.userId,
      session.role,
    );
    return NextResponse.json(festival);
  } catch (error) {
    console.error("[FESTIVAL_GET]", error);
    const message = error instanceof Error ? error.message : "Internal Error";
    if (message === "Festival not found")
      return new NextResponse(message, { status: 404 });
    if (message === "Forbidden")
      return new NextResponse(message, { status: 403 });
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const festival = await FestivalController.update(
      id,
      session.userId,
      session.role,
      body,
    );
    return NextResponse.json(festival);
  } catch (error) {
    console.error("[FESTIVAL_PATCH]", error);
    const message = error instanceof Error ? error.message : "Internal Error";
    if (message === "Festival not found")
      return new NextResponse(message, { status: 404 });
    if (message === "Forbidden")
      return new NextResponse(message, { status: 403 });
    return new NextResponse(message, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { id } = await params;
    await FestivalController.destroy(id, session.userId, session.role);
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[FESTIVAL_DELETE]", error);
    const message = error instanceof Error ? error.message : "Internal Error";
    if (message === "Festival not found")
      return new NextResponse(message, { status: 404 });
    if (message === "Forbidden")
      return new NextResponse(message, { status: 403 });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
