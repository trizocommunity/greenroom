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

export const DELETE = async (
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

    await db
      .update(pendingInvitation)
      .set({ status: "cancelled" })
      .where(eq(pendingInvitation.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[invitations/[id] DELETE]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
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

    const festivalRecord = await db.query.festival.findFirst({
      where: eq(festival.id, invitation.festivalId),
    });

    const now = new Date();
    const isExpired = new Date(invitation.expiresAt) < now;
    const isAccepted = invitation.acceptedAt !== null;

    return NextResponse.json({
      success: true,
      data: {
        email: invitation.email,
        festivalId: invitation.festivalId,
        festivalName: festivalRecord?.name ?? "Unknown Festival",
        festivalRole: invitation.festivalRole,
        expiresAt: invitation.expiresAt,
        alreadyAccepted: isAccepted,
        expired: isExpired,
      },
    });
  } catch (error) {
    console.error("[invitations/[id] GET]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
