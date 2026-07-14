import "server-only";

import { NextResponse } from "next/server";
import { deleteSession } from "@/core/auth/session";

export const POST = async () => {
  try {
    await deleteSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/logout]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
