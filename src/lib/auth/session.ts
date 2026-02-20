import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

// QA-2: Properly typed session payload — eliminates all `any` usage in this file.
export interface SessionPayload {
  userId: string;
  role: string;
  expires: Date;
  [key: string]: unknown; // allow jose standard claims to pass through
}

export async function encrypt(payload: SessionPayload) {
  if (!secretKey) throw new Error("JWT_SECRET is not defined");
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload> {
  if (!secretKey) throw new Error("JWT_SECRET is not defined");
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  return payload as unknown as SessionPayload;
}

export async function createSession(userId: string, role: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ userId, role, expires });

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires,
    sameSite: "lax",
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
    sameSite: "lax",
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
