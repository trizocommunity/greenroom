import { NextResponse } from "next/server";
import { z } from "zod";
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
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-"); // Replace multiple - with single -
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

    // 4. Create Festival
    const festival = await createFestival({
      name,
      slug,
      owner: { connect: { id: userId } },
      status: "DRAFT",
      isLocked: true,
    });

    return NextResponse.json(festival, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
