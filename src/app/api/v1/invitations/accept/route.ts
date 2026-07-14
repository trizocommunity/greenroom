import "server-only";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festival,
  festivalMember,
  pendingInvitation,
} from "@/core/database/schema";

export const POST = async (req: Request) => {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 },
      );
    }

    const invitation = await db.query.pendingInvitation.findFirst({
      where: and(
        eq(pendingInvitation.id, token),
        eq(pendingInvitation.acceptedAt, null as any),
      ),
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired invitation" },
        { status: 400 },
      );
    }

    const now = new Date();
    if (new Date(invitation.expiresAt) < now) {
      return NextResponse.json(
        { success: false, error: "Invitation has expired" },
        { status: 400 },
      );
    }

    const existingMember = await db.query.festivalMember.findFirst({
      where: and(
        eq(festivalMember.festivalId, invitation.festivalId),
        eq(festivalMember.userId, session.userId),
        eq(festivalMember.isActive, true),
      ),
    });

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: "You are already a member of this festival" },
        { status: 400 },
      );
    }

    await db.insert(festivalMember).values({
      id: crypto.randomUUID(),
      festivalId: invitation.festivalId,
      userId: session.userId,
      role: invitation.festivalRole,
      isActive: true,
    });

    await db
      .update(pendingInvitation)
      .set({ acceptedAt: now.toISOString() })
      .where(eq(pendingInvitation.id, token));

    const festivalRecord = await db.query.festival.findFirst({
      where: eq(festival.id, invitation.festivalId),
    });

    return NextResponse.json({
      success: true,
      festivalId: invitation.festivalId,
      festivalSlug: festivalRecord?.slug ?? invitation.festivalId,
    });
  } catch (error) {
    console.error("[invitations/accept POST]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
