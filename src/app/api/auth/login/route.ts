import "server-only";

import { NextResponse } from "next/server";
import { authContract } from "@/contracts";
import { verifyPassword } from "@/core/auth/password";
import { createSession } from "@/core/auth/session";
import { checkRateLimit, getClientIP } from "@/core/http/rate-limit";
import { findUserByEmail } from "@/features/auth/repositories/user.repository";

export const POST = async (req: Request) => {
  try {
    const ip = getClientIP(req);
    const rateLimit = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = authContract.login.body.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const user = await findUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        { success: false, error: "Account is inactive" },
        { status: 401 },
      );
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    await createSession(user.id, user.globalRole as "USER" | "SUPER_ADMIN");

    return NextResponse.json({ success: true, role: user.globalRole });
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
