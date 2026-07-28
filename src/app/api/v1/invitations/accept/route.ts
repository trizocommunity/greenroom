import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createSession, getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { generateId } from "@/core/database/ids";
import {
  festival,
  festivalMember,
  pendingInvitation,
  stage as stageTable,
  stageManagerAssignment,
  user as userTable,
} from "@/core/database/schema";

export const POST = async (req: Request) => {
  try {
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
        eq(pendingInvitation.status, "pending"),
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

    // The invite link is only ever delivered to the invitation's own email
    // address, so possessing a valid token is proof of ownership — the same
    // trust model magic-link sign-in already relies on. If the visitor isn't
    // signed in yet, log them into (or create) the account for that email
    // instead of forcing a separate manual sign-in round trip.
    let session = await getSession();

    if (!session?.userId) {
      let dbUser = await db.query.user.findFirst({
        where: sql`lower(${userTable.email}) = ${invitation.email}`,
      });

      if (!dbUser) {
        const result = await db
          .insert(userTable)
          .values({
            id: generateId(),
            email: invitation.email,
            globalRole: "USER",
          })
          .returning();
        dbUser = result[0];
      }

      if (!dbUser) {
        return NextResponse.json(
          { success: false, error: "Could not create account" },
          { status: 500 },
        );
      }

      const role = dbUser.globalRole as "USER" | "SUPER_ADMIN";
      await createSession(dbUser.id, role);
      session = { userId: dbUser.id, role, expires: new Date() };
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

    const [newMember] = await db
      .insert(festivalMember)
      .values({
        id: crypto.randomUUID(),
        festivalId: invitation.festivalId,
        userId: session.userId,
        role: invitation.festivalRole,
        isActive: true,
      })
      .returning();

    const invitedStageIds = invitation.metadata?.stageIds;
    if (
      invitation.festivalRole === "STAGE_MANAGER" &&
      newMember &&
      invitedStageIds?.length
    ) {
      const validStages = await db.query.stage.findMany({
        where: and(
          eq(stageTable.festivalId, invitation.festivalId),
          inArray(stageTable.id, invitedStageIds),
        ),
        columns: { id: true },
      });
      if (validStages.length > 0) {
        await db.insert(stageManagerAssignment).values(
          validStages.map((s) => ({
            id: generateId(),
            festivalId: invitation.festivalId,
            stageId: s.id,
            memberId: newMember.id,
          })),
        );
      }
    }

    await db
      .update(pendingInvitation)
      .set({ acceptedAt: now.toISOString(), status: "accepted" })
      .where(eq(pendingInvitation.id, token));

    const festivalRecord = await db.query.festival.findFirst({
      where: eq(festival.id, invitation.festivalId),
    });

    const acceptedUser = await db.query.user.findFirst({
      where: eq(userTable.id, session.userId),
    });

    return NextResponse.json({
      success: true,
      festivalId: invitation.festivalId,
      festivalSlug: festivalRecord?.slug ?? invitation.festivalId,
      requiresOnboarding: !acceptedUser?.fullName,
    });
  } catch (error) {
    console.error("[invitations/accept POST]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
