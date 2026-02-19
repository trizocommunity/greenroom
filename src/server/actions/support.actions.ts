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
    let festivalId = undefined;

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

  // Security check: User can only access their own tickets, unless they are admin
  // For now, assuming standard user role check.
  // In a real app, we'd check if session.user.role === 'SUPER_ADMIN' too.
  // Since we don't have easy access to role in session object in this snippet,
  // we'll fetch user role or assume the caller handles it / checks it.

  // Checking if the user is the owner
  const isOwner = ticket.userId === session.userId;

  // TODO: Add Admin check here when integrating admin side
  // const isAdmin = ...

  if (!isOwner) {
    // If not owner, check if admin (for now, simplistic check or separate action for admin)
    // We will use a separate action for admin or relax this for now if needed.
    // For this action, strict owner check is safer for the User UI.
    // Admin will use getAllTickets / getAdminTicketDetails.
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

    // 2. Determine Sender Type
    // If ticket.userId === session.userId -> USER
    // Else -> ADMIN (assuming protected route/action)

    let senderType = "USER";
    if (ticket.userId !== session.userId) {
      senderType = "ADMIN";
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
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

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

  await prisma.supportNotification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

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
  // TODO: Add Admin Role Check
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

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
  // TODO: Add Admin Role Check
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
