"use server";

import { and, eq } from "drizzle-orm";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festival,
  festivalMember,
  pendingInvitation,
} from "@/core/database/schema";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/core/errors/errors";
import { sendInvitationEmail } from "@/core/integrations/email";
import type { ActionResponse } from "@/core/types/actions";

const INVITATION_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours

export async function createInvitationAction(data: {
  email: string;
  festivalId: string;
  festivalRole: "ADMIN" | "ANNOUNCER" | "STAGE_MANAGER" | "MEDIA";
}): Promise<ActionResponse<{ invitationId: string }>> {
  try {
    const session = await getSession();

    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Check if inviter has access
    const festivalRecord = await db.query.festival.findFirst({
      where: eq(festival.id, data.festivalId),
    });

    if (!festivalRecord) {
      throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
    }

    const isOwner = festivalRecord.ownerId === session.userId;
    const isAdmin = await db.query.festivalMember.findFirst({
      where: and(
        eq(festivalMember.festivalId, data.festivalId),
        eq(festivalMember.userId, session.userId),
        eq(festivalMember.role, "ADMIN"),
        eq(festivalMember.isActive, true),
      ),
    });

    if (!isOwner && !isAdmin) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    // Check if already a member
    const existingMember = await db.query.user.findFirst({
      where: eq(festivalMember.userId, session.userId),
    });

    // Check if pending invitation already exists
    const existingInvitation = await db.query.pendingInvitation.findFirst({
      where: and(
        eq(pendingInvitation.email, data.email.toLowerCase()),
        eq(pendingInvitation.festivalId, data.festivalId),
        eq(pendingInvitation.acceptedAt, null as any),
      ),
    });

    if (existingInvitation) {
      return {
        success: false,
        error: "An invitation is already pending for this email",
      };
    }

    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS).toISOString();
    const token = crypto.randomUUID();

    const { randomUUID } = await import("crypto");
    const result = await db
      .insert(pendingInvitation)
      .values({
        id: token,
        email: data.email.toLowerCase(),
        festivalId: data.festivalId,
        festivalRole: data.festivalRole,
        invitedBy: session.userId,
        expiresAt,
      })
      .returning();

    const inviteUrl = `/invite/${token}`;

    try {
      await sendInvitationEmail(
        data.email,
        token,
        festivalRecord.name,
        data.festivalRole,
      );
    } catch {
      // Dev mode logs to terminal via sendInvitationEmail
    }

    return { success: true, data: { invitationId: result[0].id } };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function acceptInvitationAction(token: string): Promise<
  ActionResponse<{
    festivalId: string;
    festivalSlug: string;
  }>
> {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return {
        success: false,
        error: "You must be logged in to accept an invitation",
      };
    }

    const invitation = await db.query.pendingInvitation.findFirst({
      where: and(
        eq(pendingInvitation.id, token),
        eq(pendingInvitation.acceptedAt, null as any),
      ),
    });

    if (!invitation) {
      throw new AppError("Invalid or expired invitation");
    }

    const now = new Date();
    if (new Date(invitation.expiresAt) < now) {
      throw new AppError("Invitation has expired");
    }

    // Check if already a member
    const existingMember = await db.query.festivalMember.findFirst({
      where: and(
        eq(festivalMember.festivalId, invitation.festivalId),
        eq(festivalMember.userId, session.userId),
        eq(festivalMember.isActive, true),
      ),
    });

    if (existingMember) {
      return {
        success: false,
        error: "You are already a member of this festival",
      };
    }

    // Add user as festival member
    await db.insert(festivalMember).values({
      id: crypto.randomUUID(),
      festivalId: invitation.festivalId,
      userId: session.userId,
      role: invitation.festivalRole,
      isActive: true,
    });

    // Mark invitation as accepted
    await db
      .update(pendingInvitation)
      .set({ acceptedAt: now.toISOString() })
      .where(eq(pendingInvitation.id, token));

    // Get festival slug for redirect
    const festivalRecord = await db.query.festival.findFirst({
      where: eq(festival.id, invitation.festivalId),
    });

    return {
      success: true,
      data: {
        festivalId: invitation.festivalId,
        festivalSlug: festivalRecord?.slug ?? invitation.festivalId,
      },
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getPendingInvitationsAction(festivalId: string): Promise<
  ActionResponse<
    Array<{
      id: string;
      email: string;
      festivalRole: string;
      invitedBy: string;
      expiresAt: string;
      createdAt: string;
    }>
  >
> {
  try {
    const session = await getSession();

    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const festivalRecord = await db.query.festival.findFirst({
      where: eq(festival.id, festivalId),
    });

    if (!festivalRecord) {
      throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
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
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    const invitations = await db.query.pendingInvitation.findMany({
      where: and(
        eq(pendingInvitation.festivalId, festivalId),
        eq(pendingInvitation.acceptedAt, null as any),
      ),
    });

    return {
      success: true,
      data: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        festivalRole: inv.festivalRole,
        invitedBy: inv.invitedBy,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      })),
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function cancelInvitationAction(
  invitationId: string,
): Promise<ActionResponse<null>> {
  try {
    const session = await getSession();

    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const invitation = await db.query.pendingInvitation.findFirst({
      where: eq(pendingInvitation.id, invitationId),
    });

    if (!invitation) {
      throw new AppError("Invitation not found");
    }

    const festivalRecord = await db.query.festival.findFirst({
      where: eq(festival.id, invitation.festivalId),
    });

    if (!festivalRecord) {
      throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
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
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    await db
      .delete(pendingInvitation)
      .where(eq(pendingInvitation.id, invitationId));

    return { success: true, data: null };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getInvitationDetailsAction(token: string): Promise<
  ActionResponse<{
    email: string;
    festivalId: string;
    festivalName: string;
    festivalRole: string;
    expiresAt: string;
    alreadyAccepted: boolean;
    expired: boolean;
  }>
> {
  try {
    const invitation = await db.query.pendingInvitation.findFirst({
      where: eq(pendingInvitation.id, token),
    });

    if (!invitation) {
      throw new AppError("Invitation not found");
    }

    const festivalRecord = await db.query.festival.findFirst({
      where: eq(festival.id, invitation.festivalId),
    });

    const now = new Date();
    const isExpired = new Date(invitation.expiresAt) < now;
    const isAccepted = invitation.acceptedAt !== null;

    return {
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
    };
  } catch (error) {
    return handleActionError(error);
  }
}
