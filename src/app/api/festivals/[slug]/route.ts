import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import * as FestivalController from "@/server/controllers/festival.controller";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { slug: slugOrId } = await params;
    const festival = await findFestivalBySlugOrId(slugOrId);
    if (!festival) {
      return new NextResponse("Festival not found", { status: 404 });
    }
    const result = await FestivalController.show(
      festival.id,
      session.userId,
      session.role,
    );
    return NextResponse.json(result);
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
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { slug: slugOrId } = await params;
    const festival = await findFestivalBySlugOrId(slugOrId);
    if (!festival) {
      return new NextResponse("Festival not found", { status: 404 });
    }
    const body = await request.json();
    const result = await FestivalController.update(
      festival.id,
      session.userId,
      session.role,
      body,
    );
    return NextResponse.json(result);
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
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { slug: slugOrId } = await params;
    const festival = await findFestivalBySlugOrId(slugOrId);
    if (!festival) {
      return new NextResponse("Festival not found", { status: 404 });
    }
    await FestivalController.destroy(festival.id, session.userId, session.role);
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
