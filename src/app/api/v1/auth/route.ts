import "server-only";

import { eq, sql } from "drizzle-orm";
import { badRequest, createHandler, ok, unauthorized } from "@/api/lib";
import {
  consumeMagicLinkToken,
  createMagicLinkToken,
} from "@/core/auth/magic-link";
import { getPostAuthRoute } from "@/core/auth/routing";
import { createSession, deleteSession, getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { generateId } from "@/core/database/ids";
import { user as userTable } from "@/core/database/schema";
import { sendMagicLinkEmail } from "@/core/integrations/email";
import { findUserById } from "@/features/auth/repositories/user.repository";

const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

const handler = createHandler({
  async GET({ user }) {
    if (!user) return unauthorized();

    const dbUser = await findUserById(user.userId);
    if (!dbUser) return unauthorized();

    const { festivals: _, ...userWithoutRelations } = dbUser;
    return ok(userWithoutRelations);
  },

  async POST({ request }) {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "logout") {
      await deleteSession();
      return ok({});
    }

    if (action === "magic-link") {
      const rawBody = await request.text();
      console.error("[auth/magic-link] RAW BODY:", JSON.stringify(rawBody), "len:", rawBody.length, "content-type:", request.headers.get("content-type"));
      let body: any;
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        console.error("[auth/magic-link] JSON.parse FAILED on raw body:", e);
        throw e;
      }
      const { email } = body;

      if (!email || typeof email !== "string") {
        return badRequest("INVALID_INPUT", "Email is required");
      }

      const token = await createMagicLinkToken(email, MAGIC_LINK_EXPIRY_MS);

      // Always log in dev mode — before send attempt, so it's visible for new users too
      if (process.env.NODE_ENV !== "production") {
        const magicLinkUrl = `http://localhost:3000/login/verify/${token}`;
        console.log(`[DEV] Magic link: ${magicLinkUrl}`);
      }

      let user;
      try {
        user = await db.query.user.findFirst({
          where: eq(userTable.email, email.toLowerCase()),
        });
      } catch (e) {
        console.error("[auth/magic-link] user lookup FAILED:", e);
        throw e;
      }

      if (user) {
        try {
          await sendMagicLinkEmail(email, token);
        } catch (e) {
          console.error("[auth/magic-link] sendMagicLinkEmail FAILED:", e);
          // Send failed — URL already logged above, return success to avoid enumeration
        }
      }

      return ok({ message: "Magic link sent" });
    }

    if (action === "verify-magic-link") {
      const body = await request.json();
      const { token } = body;

      if (!token || typeof token !== "string") {
        return badRequest("INVALID_INPUT", "Token is required");
      }

      const record = await consumeMagicLinkToken(token);

      if (!record) {
        return badRequest("INVALID_TOKEN", "Invalid or expired magic link");
      }

      // Find or create stub user (case-insensitive email lookup)
      let dbUser = await db.query.user.findFirst({
        where: sql`lower(${userTable.email}) = ${record.email}`,
      });

      if (!dbUser) {
        const result = await db
          .insert(userTable)
          .values({
            id: generateId(),
            email: record.email,
            globalRole: "USER",
          })
          .returning();
        dbUser = result[0];
      }

      if (!dbUser) {
        return badRequest("USER_CREATION_FAILED", "Could not create user");
      }

      const role = dbUser.globalRole as "USER" | "SUPER_ADMIN";

      await createSession(dbUser.id, role);

      const requiresOnboarding = !dbUser.fullName;

      return ok({
        role,
        requiresOnboarding,
        redirectTo: getPostAuthRoute({ role, requiresOnboarding }),
      });
    }

    return badRequest(
      "INVALID_ACTION",
      "Missing or invalid action. Use ?action=magic-link, ?action=verify-magic-link, or ?action=logout",
    );
  },
});

export const GET = handler;
export const POST = handler;
