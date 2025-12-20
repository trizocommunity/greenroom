import "dotenv/config";
import { prisma } from "./src/lib/db";

async function verify() {
  console.log("Starting Phase 1 Verification...");

  // 1. Create User
  const userEmail = `test-${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email: userEmail,
      password: "password123",
      globalRole: "USER",
    },
  });
  console.log("✅ Created User:", user.id);

  // 2. Create Festival (1st)
  const festival = await prisma.festival.create({
    data: {
      name: "My Test Festival",
      ownerId: user.id,
      status: "DRAFT",
    },
  });
  console.log("✅ Created Festival:", festival.id);

  // 3. Try Create Festival (2nd) - SHOULD FAIL
  try {
    await prisma.festival.create({
      data: {
        name: "Second Festival",
        ownerId: user.id, // Same owner
        status: "DRAFT",
      },
    });
    console.error(
      "❌ FAILED: Second festival creation should have been blocked!",
    );
  } catch (e) {
    console.log(
      "✅ PASSED: Second festival creation blocked by Unique constraint.",
    );
  }

  // 4. Create Edition
  const edition = await prisma.edition.create({
    data: {
      festivalId: festival.id,
      year: 2025,
      name: "2025 Edition",
      startsAt: new Date(),
      endsAt: new Date(),
    },
  });
  console.log("✅ Created Edition:", edition.id);

  // 5. Try Duplicate Edition Year - SHOULD FAIL
  try {
    await prisma.edition.create({
      data: {
        festivalId: festival.id,
        year: 2025, // Same year
        name: "Duplicate 2025",
        startsAt: new Date(),
        endsAt: new Date(),
      },
    });
    console.error(
      "❌ FAILED: Duplicate edition year should have been blocked!",
    );
  } catch (e) {
    console.log(
      "✅ PASSED: Duplicate edition year blocked by Unique constraint.",
    );
  }

  console.log("Verification Complete.");
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
