import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { institution, user as userTable } from "@/core/database/schema";

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
    const {
      fullName,
      displayName,
      userRole,
      institutionName,
      institutionType,
      affiliation,
      city,
      sizeRange,
    } = body;

    if (
      !fullName ||
      !displayName ||
      !userRole ||
      !institutionName ||
      !institutionType
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { randomUUID } = await import("crypto");
    const institutionResult = await db
      .insert(institution)
      .values({
        id: randomUUID(),
        name: institutionName,
        type: institutionType,
        affiliation: affiliation || null,
        city: city || null,
        sizeRange: sizeRange || null,
        ownerId: session.userId,
      })
      .returning();

    const newInstitution = institutionResult[0];

    await db
      .update(userTable)
      .set({
        fullName,
        displayName,
        accountType: "INSTITUTIONAL",
        institutionId: newInstitution.id,
      })
      .where(eq(userTable.id, session.userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[onboarding/institutional]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
