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
import { fromNow, MS } from "@/core/datetime/server";
import { sendInvitationEmail } from "@/core/integrations/email";

const INVITATION_EXPIRY_MS = 48 * MS.hour;

export const POST = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const { id } = await params;

    const invitation = await db.query.pendingInvitation.findFirst({
      where: eq(pendingInvitation.id, id),
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 },
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { success: false, error: "Invitation has already been accepted" },
        { status: 400 },
      );
    }

    const festivalRecord = await db.query.festival.findFirst({
      where: eq(festival.id, invitation.festivalId),
    });

    if (!festivalRecord) {
      return NextResponse.json(
        { success: false, error: "Festival not found" },
        { status: 404 },
      );
    }

    const isOwner = festivalRecord.ownerId === session.userId;
    const isAdmin = await db.query.festivalMember.findFirst({
      where: and(
        eq(festivalMember.festivalId, invitation.festivalId),
        eq(festivalMember.userId, session.userId),
        eq(festivalMember.role, "ADMIN"),
        eq(festivalMember.isActive, true),
      ),
    });

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const expiresAt = fromNow(INVITATION_EXPIRY_MS);

    await db
      .update(pendingInvitation)
      .set({ expiresAt, status: "pending" })
      .where(eq(pendingInvitation.id, id));

    try {
      await sendInvitationEmail(
        invitation.email,
        invitation.id,
        festivalRecord.name,
        invitation.festivalRole,
      );
    } catch (emailError) {
      console.error("[invitations/[id]/resend POST] email error:", emailError);
      return NextResponse.json(
        {
          success: true,
          warning: "Invitation reset, but the email failed to send",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[invitations/[id]/resend POST]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
