import { NextResponse } from "next/server";
import { z } from "zod";
import { formatApiError } from "@/lib/api-error";
import { systemConfig } from "@/lib/config";
import { getSession } from "@/lib/auth/session";
import {
  createFestival,
  findFestivalByOwnerId,
  findFestivalBySlug,
} from "@/server/models/festival.model";

const createFestivalSchema = z.object({
  name: z.string().min(3).max(50),
});

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-"); // Replace multiple - with single -
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = session;

    // 1. Check if user already owns a festival
    const existingFestival = await findFestivalByOwnerId(userId);
    if (existingFestival) {
      return NextResponse.json(
        { error: "User already has a festival" },
        { status: 400 },
      );
    }

    // 2. Parse Body
    const body = await request.json();
    const { name } = createFestivalSchema.parse(body);

    // 3. Generate Slug
    let slug = slugify(name);
    // basic uniqueness check/suffixing could be added here,
    // but for now relying on DB unique constraint to fail if strictly duplicate
    // Ideally we append random string if conflict, but let's check first?
    const conflict = await findFestivalBySlug(slug);
    if (conflict) {
      slug = `${slug}-${Math.floor(Math.random() * 10000)}`;
    }

    // [New Phase 2] Payment Enforcement
    let paymentIdToConsume: string | null = null;

    if (systemConfig.paymentFirstFlowEnabled) {
      const { getUnusedPayment, consumePayment } = await import(
        "@/server/services/billing.service"
      );
      const payment = await getUnusedPayment(userId);

      if (!payment) {
        return NextResponse.json(
          { error: "Payment required. Please purchase a credit first." },
          { status: 402 },
        );
      }
      paymentIdToConsume = payment.id;
    }

    // 4. Create Festival
    const festival = await createFestival({
      name,
      slug,
      owner: { connect: { id: userId } },
      status: "DRAFT",
      isLocked: true,
    });

    // [New Phase 2] Consume Payment
    if (paymentIdToConsume) {
      const { consumePayment } = await import(
        "@/server/services/billing.service"
      );
      await consumePayment(paymentIdToConsume, { festivalId: festival.id });
    }

    return NextResponse.json(festival, { status: 201 });
  } catch (error) {
    const payload = formatApiError(error);
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(payload, { status });
  }
}
