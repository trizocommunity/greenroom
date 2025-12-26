import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import * as CategoryController from "@/server/controllers/category.controller";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ editionId: string }> },
) {
  const session = await getSession();
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { editionId } = await params;

  try {
    const data = await CategoryController.index(editionId);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ editionId: string }> },
) {
  const session = await getSession();
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { editionId } = await params;

  try {
    const body = await request.json();
    const data = await CategoryController.store(editionId, body);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
