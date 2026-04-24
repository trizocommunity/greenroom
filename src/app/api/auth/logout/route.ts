import { type NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/core/auth/session";

export async function POST(_req: NextRequest) {
  await deleteSession();
  return NextResponse.json({ success: true });
}
