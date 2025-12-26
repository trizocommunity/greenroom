import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import * as ProgrammeController from "@/server/controllers/programme.controller";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ editionId: string; id: string }> },
) {
  const session = await getSession();
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { editionId, id } = await params;

  try {
    const body = await request.json();
    const data = await ProgrammeController.update(id, editionId, body);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ editionId: string; id: string }> },
) {
  const session = await getSession();
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { editionId, id } = await params;

  try {
    await ProgrammeController.destroy(id, editionId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
