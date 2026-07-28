import "server-only";

import { and, eq, inArray, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festival,
  festivalMember,
  pendingInvitation,
  stage as stageTable,
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
    const { email, festivalId, festivalRole, stageIds } = body;

    if (!email || !festivalId || !festivalRole) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (festivalRole === "STAGE_MANAGER") {
      if (!Array.isArray(stageIds) || stageIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "At least one stage is required for a stage manager",
          },
          { status: 400 },
        );
      }
      const validStages = await db.query.stage.findMany({
        where: and(
          eq(stageTable.festivalId, festivalId),
          inArray(stageTable.id, stageIds),
        ),
        columns: { id: true },
      });
      if (validStages.length !== stageIds.length) {
        return NextResponse.json(
          { success: false, error: "One or more stages are invalid" },
          { status: 400 },
        );
      }
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
        status: "pending",
        metadata: festivalRole === "STAGE_MANAGER" ? { stageIds } : undefined,
      })
      .returning();

    if (process.env.NODE_ENV !== "production") {
      const inviteUrl = `http://localhost:3000/invite/${token}`;
      console.log(
        `[DEV] Invitation: ${email} → ${festivalRecord.name} (${festivalRole})`,
      );
      console.log(`[DEV] Invite link: ${inviteUrl}`);
    }

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

    const now = new Date();

    await db
      .update(pendingInvitation)
      .set({ status: "expired" })
      .where(
        and(
          eq(pendingInvitation.festivalId, festivalId),
          eq(pendingInvitation.status, "pending"),
          lt(pendingInvitation.expiresAt, now.toISOString()),
        ),
      );

    const invitations = await db.query.pendingInvitation.findMany({
      where: and(
        eq(pendingInvitation.festivalId, festivalId),
        inArray(pendingInvitation.status, ["pending", "expired"]),
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
