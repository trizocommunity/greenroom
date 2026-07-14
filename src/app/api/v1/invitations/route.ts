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
import { sendInvitationEmail } from "@/core/integrations/email";

const INVITATION_EXPIRY_MS = 48 * 60 * 60 * 1000;

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
    const { email, festivalId, festivalRole } = body;

    if (!email || !festivalId || !festivalRole) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const festivalRecord = await db.query.festival.findFirst({
      where: eq(festival.id, festivalId),
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
        eq(festivalMember.festivalId, festivalId),
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

    const existingInvitation = await db.query.pendingInvitation.findFirst({
      where: and(
        eq(pendingInvitation.email, email.toLowerCase()),
        eq(pendingInvitation.festivalId, festivalId),
        eq(pendingInvitation.acceptedAt, null as any),
      ),
    });

    if (existingInvitation) {
      return NextResponse.json(
        {
          success: false,
          error: "An invitation is already pending for this email",
        },
        { status: 400 },
      );
    }

    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS).toISOString();
    const token = crypto.randomUUID();

    const result = await db
      .insert(pendingInvitation)
      .values({
        id: token,
        email: email.toLowerCase(),
        festivalId,
        festivalRole,
        invitedBy: session.userId,
        expiresAt,
      })
      .returning();

    try {
      await sendInvitationEmail(
        email,
        token,
        festivalRecord.name,
        festivalRole,
      );
    } catch {
      // Dev mode logs to terminal
    }

    return NextResponse.json({ success: true, invitationId: result[0].id });
  } catch (error) {
    console.error("[invitations POST]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};

export const GET = async (req: Request) => {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const festivalId = searchParams.get("festivalId");

    if (!festivalId) {
      return NextResponse.json(
        { success: false, error: "festivalId is required" },
        { status: 400 },
      );
    }

    const festivalRecord = await db.query.festival.findFirst({
      where: eq(festival.id, festivalId),
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
        eq(festivalMember.festivalId, festivalId),
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

    const invitations = await db.query.pendingInvitation.findMany({
      where: and(
        eq(pendingInvitation.festivalId, festivalId),
        eq(pendingInvitation.acceptedAt, null as any),
      ),
    });

    return NextResponse.json({ success: true, data: invitations });
  } catch (error) {
    console.error("[invitations GET]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
