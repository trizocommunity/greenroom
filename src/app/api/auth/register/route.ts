import { NextResponse } from "next/server";
import { z } from "zod";
import { formatApiError } from "@/lib/api-error";
import { hashPassword } from "@/lib/auth/password";
import type { GlobalRole } from "@/lib/auth/session";
import { createSession } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validations/auth";
import { createUser, findUserByEmail } from "@/server/models/user.model";

export async function POST(request: Request) {
  try {
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
