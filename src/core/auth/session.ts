import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

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
    .setExpirationTime("7d")
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
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
  try {
    return await decrypt(session);
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
