"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";

// -----------------------------------------------------------------------------
// User Actions
// -----------------------------------------------------------------------------

export async function createTicketAction(data: {
  subject: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  message: string;
  slug?: string;
}) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  try {
    let festivalId: string | undefined;

    if (data.slug) {
      const festival = await prisma.festival.findUnique({
        where: { slug: data.slug },
        select: { id: true },
      });
      if (festival) {
        festivalId = festival.id;
      }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session.userId,
        subject: data.subject,
        category: data.category,
        priority: data.priority,
        festivalId: festivalId,
        messages: {
          create: {
            senderType: "USER",
            senderId: session.userId,
            message: data.message,
            isRead: true, // User reads their own message
          },
        },
      },
    });

    // Notify All Super Admins
    const admins = await prisma.user.findMany({
      where: { globalRole: "SUPER_ADMIN" },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.supportNotification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "NEW_TICKET",
          referenceId: ticket.id,
          isRead: false,
        })),
      });
    }

    revalidatePath("/dashboard");
    return { success: true, ticketId: ticket.id };
  } catch (error) {
    console.error("Failed to create ticket:", error);
    return { success: false, error: "Failed to create ticket" };
  }
}

export async function getUserTicketsAction() {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.userId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return tickets;
}

export async function getTicketDetailsAction(ticketId: string) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
      festival: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!ticket) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  // SEC-3 FIX: Enforce access control — only the ticket owner or a SUPER_ADMIN may view.
  const isOwner = ticket.userId === session.userId;
  const isSuperAdmin = session.role === "SUPER_ADMIN";

  if (!isOwner && !isSuperAdmin) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  return ticket;
}

export async function sendMessageAction(ticketId: string, message: string) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  try {
    // 1. Verify ticket exists
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

    // 2. Determine Sender Type (SEC-4 FIX)
    // Derive from session role, NOT from ticket ownership.
    // Previously this allowed any user to post as ADMIN on tickets they don't own.
    const isSuperAdmin = session.role === "SUPER_ADMIN";
    let senderType = "USER";

    if (isSuperAdmin) {
      senderType = "ADMIN";
    } else if (ticket.userId !== session.userId) {
      // Not the ticket owner AND not an admin — reject.
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    // 3. Create message
    await prisma.supportMessage.create({
      data: {
        ticketId,
        senderType,
        senderId: session.userId,
        message,
        isRead: false, // Recepient hasn't read it
      },
    });

    // 4. Update ticket updatedAt and status if needed
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        updatedAt: new Date(),
        // If user replies, maybe set status to OPEN or IN_PROGRESS if it was RESOLVED?
        status: senderType === "USER" ? "OPEN" : ticket.status,
      },
    });

    // 5. Create Notification if sender is ADMIN (Notify User)
    if (senderType === "ADMIN") {
      await prisma.supportNotification.create({
        data: {
          userId: ticket.userId,
          type: "NEW_REPLY",
          referenceId: ticket.id,
          isRead: false,
        },
      });
    } else {
      // Notify All Super Admins
      const admins = await prisma.user.findMany({
        where: { globalRole: "SUPER_ADMIN" },
        select: { id: true },
      });

      if (admins.length > 0) {
        await prisma.supportNotification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "NEW_REPLY",
            referenceId: ticket.id,
            isRead: false,
          })),
        });
      }
    }

    revalidatePath(`/dashboard/support/tickets/${ticketId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send message", error);
    return { success: false, error: "Failed to send message" };
  }
}

// -----------------------------------------------------------------------------
// Notification Actions
// -----------------------------------------------------------------------------

export async function getUserNotificationsAction() {
  const session = await getSession();
  if (!session?.userId) return [];

  const notifications = await prisma.supportNotification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Fetch related ticket details manually since there's no direct relation
  const ticketIds = notifications.map((n) => n.referenceId);
  const tickets = await prisma.supportTicket.findMany({
    where: { id: { in: ticketIds } },
    select: {
      id: true,
      subject: true,
      festival: {
        select: {
          name: true,
        },
      },
    },
  });

  // Map ticket data to notifications
  const enrichedNotifications = notifications.map((notification) => {
    const ticket = tickets.find((t) => t.id === notification.referenceId);
    return {
      ...notification,
      ticketSubject: ticket?.subject || "Unknown Ticket",
      festivalName: ticket?.festival?.name,
    };
  });

  return enrichedNotifications;
}

export async function markNotificationAsReadAction(notificationId: string) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  // SEC-5 FIX: Scope the update to the current user's notifications only.
  // This prevents any logged-in user from marking another user's notifications as read.
  const updated = await prisma.supportNotification.updateMany({
    where: { id: notificationId, userId: session.userId },
    data: { isRead: true },
  });

  if (updated.count === 0) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function markAllNotificationsAsReadAction() {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  await prisma.supportNotification.updateMany({
    where: { userId: session.userId, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// -----------------------------------------------------------------------------
// Admin Actions
// -----------------------------------------------------------------------------

export async function getAllTicketsAction() {
  // SEC-1 FIX: SUPER_ADMIN-only action.
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  if (session.role !== "SUPER_ADMIN") throw new AppError(ERROR_MESSAGES.FORBIDDEN);

  const tickets = await prisma.supportTicket.findMany({
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
      festival: {
        select: {
          name: true,
          slug: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return tickets;
}

export async function updateTicketStatusAction(
  ticketId: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
) {
  // SEC-2 FIX: SUPER_ADMIN-only action.
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  if (session.role !== "SUPER_ADMIN") throw new AppError(ERROR_MESSAGES.FORBIDDEN);

  try {
    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
      select: { userId: true, id: true }, // Select to create notification
    });

    // Notify User
    await prisma.supportNotification.create({
      data: {
        userId: ticket.userId,
        type: "STATUS_CHANGE",
        referenceId: ticket.id,
        isRead: false,
      },
    });

    revalidatePath("/super-admin/support");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update status" };
  }
}
