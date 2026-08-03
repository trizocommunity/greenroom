import "server-only";

import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { MS, nowPlus } from "@/core/datetime/server";

/** Matches Prisma GlobalRole – use for type-safe session role */
export type GlobalRole = "USER" | "SUPER_ADMIN";

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  role: GlobalRole;
  expires: Date;
  [key: string]: unknown;
}

export async function encrypt(payload: SessionPayload) {
  const key = getSecretKey();
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload> {
  const key = getSecretKey();
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  return payload as unknown as SessionPayload;
}

export async function createSession(userId: string, role: GlobalRole) {
  const expires = nowPlus(MS.month);
  const session = await encrypt({ userId, role, expires });

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires,
    sameSite: "strict",
    path: "/",
  });
}

export async function updateSession(data: Partial<SessionPayload>) {
  const session = await getSession();
  if (!session) return;

  const newPayload: SessionPayload = {
    ...session,
    ...data,
    expires: nowPlus(MS.month),
  };

  const newToken = await encrypt(newPayload);
  const cookieStore = await cookies();
  cookieStore.set("session", newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: newPayload.expires,
    sameSite: "strict",
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;

  let payload: SessionPayload;
  try {
    payload = await decrypt(session);
  } catch {
    return null;
  }

  const userExists = await userExistsById(payload.userId);
  if (!userExists) {
    cookieStore.delete("session");
    return null;
  }

  return payload;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

async function userExistsById(userId: string): Promise<boolean> {
  const { db } = await import("@/core/database/client");
  const { user } = await import("@/core/database/schema");
  const row = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row.length > 0;
}
