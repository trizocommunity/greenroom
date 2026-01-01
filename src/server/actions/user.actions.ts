"use server";

import { getSession } from "@/lib/auth/session";

export async function getCurrentUser() {
  try {
    const session = await getSession();
    return session;
  } catch (error) {
    return null;
  }
}
