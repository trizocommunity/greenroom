import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import * as ParticipantController from "@/server/controllers/participant.controller";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ editionId: string }> },
) {
  const session = await getSession();
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { editionId } = await params;
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId") || undefined;

  try {
    const data = await ParticipantController.index(editionId, groupId);
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
    const data = await ParticipantController.store(editionId, body);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
