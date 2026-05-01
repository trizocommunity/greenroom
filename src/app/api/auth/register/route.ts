import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/core/auth/password";
import type { GlobalRole } from "@/core/auth/session";
import { createSession } from "@/core/auth/session";
import { formatApiError } from "@/core/http/api-error";
import { checkRateLimit, getClientIP } from "@/core/http/rate-limit";
import {
  createUser,
  findUserByEmail,
} from "@/features/auth/repositories/user.repository";
import { registerSchema } from "@/features/auth/schemas/auth.schema";

export async function POST(request: Request) {
  try {
    // Rate limiting: 3 attempts per 15 minutes per IP (stricter for registration)
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`register:${clientIP}`, 3, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { email, password } = registerSchema.parse(body);

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await createUser({
      email,
      password: hashedPassword,
    });

    await createSession(user.id, (user.globalRole ?? "USER") as GlobalRole);

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    const payload = formatApiError(error);
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(payload, { status });
  }
}
