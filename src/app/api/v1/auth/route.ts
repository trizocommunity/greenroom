import "server-only";

import { loginInput } from "@/api/contracts/auth";
import { badRequest, createHandler, ok, unauthorized } from "@/api/lib";
import { verifyPassword } from "@/core/auth/password";
import { createSession, deleteSession, getSession } from "@/core/auth/session";
import {
  findUserByEmail,
  findUserById,
} from "@/features/auth/repositories/user.repository";

const handler = createHandler({
  async GET({ user }) {
    if (!user) return unauthorized();

    const dbUser = await findUserById(user.userId);
    if (!dbUser) return unauthorized();

    const { password: _, festivals: __, ...userWithoutPassword } = dbUser;
    return ok(userWithoutPassword);
  },

  async POST({ request }) {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "logout") {
      await deleteSession();
      return ok({});
    }

    if (action !== "login") {
      return badRequest(
        "INVALID_ACTION",
        "Missing or invalid action. Use ?action=login or ?action=logout",
      );
    }

    const body = await request.json();
    const parsed = loginInput.safeParse(body);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const { email, password } = parsed.data;
    const user = await findUserByEmail(email);

    if (!user) {
      return badRequest("INVALID_CREDENTIALS", "Invalid email or password");
    }

    if (!user.isActive) {
      return unauthorized("Account is inactive");
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return badRequest("INVALID_CREDENTIALS", "Invalid email or password");
    }

    await createSession(user.id, user.globalRole as "USER" | "SUPER_ADMIN");

    return ok({ role: user.globalRole });
  },
});

export const GET = handler;
export const POST = handler;
