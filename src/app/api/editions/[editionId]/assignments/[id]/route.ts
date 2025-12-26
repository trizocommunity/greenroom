import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import * as AssignmentController from "@/server/controllers/assignment.controller";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ editionId: string; id: string }> },
) {
  const session = await getSession();
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { editionId, id } = await params;

  try {
    await AssignmentController.destroy(id, editionId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
