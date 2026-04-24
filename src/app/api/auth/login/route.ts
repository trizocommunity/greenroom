import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/core/auth/password";
import { createSession } from "@/core/auth/session";
import { formatApiError } from "@/core/http/api-error";
import { checkRateLimit, getClientIP } from "@/core/http/rate-limit";
import { findUserByEmail } from "@/features/auth/repositories/user.repository";
import { loginSchema } from "@/features/auth/schemas/auth.schema";

export async function POST(request: Request) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`login:${clientIP}`, 5, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await findUserByEmail(email);

    if (!user || user.isActive === false) {
      return NextResponse.json(
        { error: "Invalid credentials or inactive account" },
        { status: 401 },
      );
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    await createSession(user.id, user.globalRole);

    return NextResponse.json({ success: true, role: user.globalRole });
  } catch (error) {
    const payload = formatApiError(error);
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(payload, { status });
  }
}
