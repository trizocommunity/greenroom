import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { GlobalRole } from "@prisma/client";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    // Prevent deleting self
    if (id === session.userId) {
        return new NextResponse("Cannot delete own account", { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
        where: { id }
    });

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    // Prevent deleting other SUPER_ADMINs (optional safety, implementation choice)
    // but user requested visual disabled state, good to enforce on backend too unless intentional.
    // Let's allow it but maybe warn? For now, allow it as standard logic implies admins manage admins.
    
    await prisma.user.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[USER_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const session = await getSession();
      if (!session || session.role !== "SUPER_ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 });
      }
  
      const { id } = await params;
      const body = await request.json();
      const { fullName, email, globalRole } = body;
  
      // Basic validation
      if (!email) {
        return new NextResponse("Email is required", { status: 400 });
      }

      // Check for email collision if email changed
      const existingUser = await prisma.user.findUnique({
          where: { email }
      });
      if (existingUser && existingUser.id !== id) {
          return new NextResponse("Email already in use", { status: 409 });
      }
  
      await prisma.user.update({
        where: { id },
        data: {
            fullName,
            email,
            globalRole: globalRole as GlobalRole
        }
      });
  
      return new NextResponse(null, { status: 200 });
    } catch (error) {
      console.error("[USER_UPDATE]", error);
      return new NextResponse("Internal Error", { status: 500 });
    }
  }
