import { NextResponse } from "next/server";
import { z } from "zod";
import { formatApiError } from "@/lib/api-error";
import { hashPassword } from "@/lib/auth/password";
import type { GlobalRole } from "@/lib/auth/session";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validations/auth";
import { createUser, findUserByEmail } from "@/server/models/user.model";

export async function POST(request: Request) {
  try {
    // Rate limiting: 3 attempts per 15 minutes per IP (stricter for registration)
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`register:${clientIP}`, 3, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
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
