require("dotenv").config();
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

async function main() {
  console.log("Starting direct SQL seed...");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database");

    const email = "trizocommunity@gmail.com";
    const password = "786trizo";
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const checkRes = await client.query(
      'SELECT id FROM "User" WHERE email = $1',
      [email],
    );

    if (checkRes.rows.length > 0) {
      console.log("User exists, updating role...");
      await client.query(
        'UPDATE "User" SET "globalRole" = $1, "passwordHash" = $2, "fullName" = $3 WHERE email = $4',
        ["SUPER_ADMIN", hashedPassword, "Super Admin", email],
      );
    } else {
      console.log("Creating new Super Admin user...");
      // We need to generate a CUID-like ID or let the DB handle it if it was default generated,
      // but Prisma usually generates CUIDs in the client.
      // Since we are bypassing Prisma, we can generate a random string or use a library.
      // For simplicity, we'll try to let the database handle it if there's a default,
      // otherwise, we generate a basic random ID.
      // Looking at schema: id String @id @default(cuid())
      // The default(cuid()) is a Prisma-level function, it is NOT a database default usually unless mapped.

      // Let's generate a pseudo-cuid
      const id =
        "c" +
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      await client.query(
        'INSERT INTO "User" ("id", "email", "passwordHash", "fullName", "globalRole", "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
        [id, email, hashedPassword, "Super Admin", "SUPER_ADMIN", true],
      );
    }

    console.log("Seed completed successfully.");
  } catch (err) {
    console.error("Error during seeding:", err);
  } finally {
    await client.end();
  }
}

main();
