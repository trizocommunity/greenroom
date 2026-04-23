import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { findAllUsers } from "@/server/models/user.model";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.role !== "SUPER_ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // TODO: implement search filtering for Drizzle if needed
    const users = await findAllUsers(undefined, "desc");

    return NextResponse.json(users);
  } catch (error) {
    console.error("[USERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
