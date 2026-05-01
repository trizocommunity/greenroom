import { NextResponse } from "next/server";
import { getSession } from "@/core/auth/session";
import { findFestivalByOwnerId } from "@/features/festivals/repositories/festival.repository";

export async function GET(_request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const festival = await findFestivalByOwnerId(session.userId);

    if (!festival) {
      return NextResponse.json({ festival: null });
    }

    return NextResponse.json({ festival });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
