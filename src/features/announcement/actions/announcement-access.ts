import { and, eq } from "drizzle-orm";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festivalMember as festivalMemberTable,
  festival as festivalTable,
  user as userTable,
} from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";

export async function assertAnnouncerAccess(
  festivalId: string,
): Promise<string> {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { id: true, ownerId: true },
  });
  if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);

  if (session.role === "SUPER_ADMIN" || festival.ownerId === session.userId) {
    const user = await db.query.user.findFirst({
      where: eq(userTable.id, session.userId),
      columns: { displayName: true, fullName: true, email: true },
    });
    return (
      user?.displayName || user?.fullName || user?.email || "Festival Admin"
    );
  }

  const member = await db.query.festivalMember.findFirst({
    where: and(
      eq(festivalMemberTable.festivalId, festivalId),
      eq(festivalMemberTable.userId, session.userId),
    ),
    with: {
      user: { columns: { displayName: true, fullName: true, email: true } },
    },
  });

  if (
    !member?.isActive ||
    (member.role !== "ANNOUNCER" && member.role !== "ADMIN")
  ) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  return (
    member.user.displayName ||
    member.user.fullName ||
    member.user.email ||
    "Announcer"
  );
}
