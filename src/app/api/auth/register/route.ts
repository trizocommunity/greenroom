import "server-only";

import { NextResponse } from "next/server";
import { authContract } from "@/contracts";
import { hashPassword } from "@/core/auth/password";
import { createSession } from "@/core/auth/session";
import { checkRateLimit, getClientIP } from "@/core/http/rate-limit";
import {
  createUser,
  findUserByEmail,
} from "@/features/auth/repositories/user.repository";

export const POST = async (req: Request) => {
  try {
    const ip = getClientIP(req);
    const rateLimit = checkRateLimit(`register:${ip}`, 3, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = authContract.register.body.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await hashPassword(password);
    const user = await createUser({
      email,
      password: hashedPassword,
    });

    await createSession(
      user.id,
      (user.globalRole ?? "USER") as "USER" | "SUPER_ADMIN",
    );

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
