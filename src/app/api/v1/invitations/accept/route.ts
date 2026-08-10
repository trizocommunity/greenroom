import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  appendSetCookieHeaders,
  getSession,
  signInUserByEmail,
} from "@/core/auth/session";
import { db } from "@/core/database/client";
import { generateId } from "@/core/database/ids";
import {
  festival,
  festivalMember,
  pendingInvitation,
  stageManagerAssignment,
  stage as stageTable,
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
    // trust model email-OTP sign-in already relies on. If the visitor isn't
    // signed in yet, log them into (or create) the account for that email
    // instead of forcing a separate manual sign-in round trip.
    let session = await getSession();
    let signInResponse: Response | null = null;

    if (!session?.userId) {
      let dbUser = await db.query.user.findFirst({
        where: eq(userTable.email, invitation.email.toLowerCase()),
      });

      if (!dbUser) {
        const result = await db
          .insert(userTable)
          .values({
            id: generateId(),
            email: invitation.email.toLowerCase(),
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

      // Mint a session via Better Auth. Keep the Response so we can
      // forward Set-Cookie onto our JSON reply for the browser fetch.
      try {
        signInResponse = await signInUserByEmail(dbUser.email);
      } catch (err) {
        console.error("[invitations/accept] signInUserByEmail failed", err);
        return NextResponse.json(
          { success: false, error: "Could not create session" },
          { status: 500 },
        );
      }
      session = await getSession();
      if (!session?.userId) {
        // nextCookies may have written the session for this request even
        // when getSession still cannot see it — fall back to the user we
        // just signed in for.
        session = {
          userId: dbUser.id,
          role: "USER",
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          email: dbUser.email,
        };
      }
    }

    const existingMember = await db.query.festivalMember.findFirst({
      where: and(
        eq(festivalMember.festivalId, invitation.festivalId),
        eq(festivalMember.userId, session.userId),
        eq(festivalMember.isActive, true),
      ),
    });

    if (existingMember) {
      const alreadyMember = NextResponse.json(
        { success: false, error: "You are already a member of this festival" },
        { status: 400 },
      );
      if (signInResponse) {
        appendSetCookieHeaders(alreadyMember, signInResponse.headers);
      }
      return alreadyMember;
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

    revalidatePath("/", "layout");

    const response = NextResponse.json({
      success: true,
      festivalId: invitation.festivalId,
      festivalSlug: festivalRecord?.slug ?? invitation.festivalId,
      requiresOnboarding: !acceptedUser?.fullName,
    });
    if (signInResponse) {
      appendSetCookieHeaders(response, signInResponse.headers);
    }
    return response;
  } catch (error) {
    console.error("[invitations/accept POST]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
