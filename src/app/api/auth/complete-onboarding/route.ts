import "server-only";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { authContract } from "@/contracts";
import { getSession } from "@/core/auth/session";
import { updateUser } from "@/features/auth/repositories/user.repository";
import { createAuditLog } from "@/features/auth/services/audit-log.service";

export const POST = async (req: Request) => {
  try {
    const session = await getSession();

    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const parsed = authContract.completeOnboarding.body.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    const { fullName, displayName } = parsed.data;

    await updateUser(session.userId, {
      fullName,
      displayName,
    });

    await createAuditLog({
      action: "COMPLETE_ONBOARDING",
      targetType: "USER",
      targetId: session.userId,
      metadata: { fullName, displayName },
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/complete-onboarding]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
