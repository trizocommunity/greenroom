import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { user as userTable } from "@/core/database/schema";
import { completePersonalOnboardingAction } from "@/features/auth/actions/onboarding.actions";

export const POST = async (req: Request) => {
  try {
    const session = await getSession();

    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { fullName, displayName, userRole } = body;

    if (!fullName || !displayName || !userRole) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    await db
      .update(userTable)
      .set({
        fullName,
        displayName,
        accountType: "PERSONAL",
      })
      .where(eq(userTable.id, session.userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[onboarding/personal]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
