import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import * as AssignmentController from "@/server/controllers/assignment.controller";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const programmeId = searchParams.get("programmeId");

  if (!programmeId)
    return NextResponse.json(
      { error: "Programme ID required" },
      { status: 400 },
    );

  try {
    const data = await AssignmentController.index(programmeId);
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
    const data = await AssignmentController.store(editionId, body);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
