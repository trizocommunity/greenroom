import { NextResponse } from "next/server";
import { getSession } from "@/core/auth/session";
import {
  findFestivalBySlugOrId,
  updateFestival,
  deleteFestival,
} from "@/features/festivals/repositories/festival.repository";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";

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
    const isOwner = festival.ownerId === session.userId;
    const isSuperAdmin = session.role === "SUPER_ADMIN";
    if (!isOwner && !isSuperAdmin) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return NextResponse.json(festival);
  } catch (error) {
    console.error("[FESTIVAL_GET]", error);
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
    const isOwner = festival.ownerId === session.userId;
    const isSuperAdmin = session.role === "SUPER_ADMIN";
    if (!isOwner && !isSuperAdmin) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const body = await request.json();
    const result = await updateFestival(festival.id, body);
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
    const isOwner = festival.ownerId === session.userId;
    const isSuperAdmin = session.role === "SUPER_ADMIN";
    if (!isOwner && !isSuperAdmin) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    await deleteFestival(festival.id);
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
