import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.role !== "SUPER_ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true, // Assuming schema has fullName based on seed/schema checks
        globalRole: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("[USERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
