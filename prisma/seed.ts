import "dotenv/config";
import bcrypt from "bcryptjs";
import { Client } from "pg";

async function main() {
  console.log("Starting direct SQL seed...");

  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DIRECT_URL (or fallback DATABASE_URL) is missing");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log("Connected to database");

    const email = "trizocommunity@gmail.com";
    const password = "786trizo";
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const checkRes = await client.query(
      'SELECT id FROM "user" WHERE email = $1',
      [email],
    );

    if (checkRes.rows.length > 0) {
      console.log("User exists, updating role...");
      await client.query(
        'UPDATE "user" SET "globalRole" = $1, "password" = $2, "fullName" = $3, "displayName" = $4, "age" = $5 WHERE email = $6',
        ["SUPER_ADMIN", hashedPassword, "Trizo Creatives", "Trizo", 20, email],
      );
    } else {
      console.log("Creating new Super Admin user...");
      // Generate a pseudo-cuid
      const id =
        "c" +
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      await client.query(
        'INSERT INTO "user" ("id", "email", "password", "fullName", "displayName", "age", "globalRole", "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())',
        [
          id,
          email,
          hashedPassword,
          "Trizo Community",
          "Trizo",
          null,
          "SUPER_ADMIN",
          true,
        ],
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
