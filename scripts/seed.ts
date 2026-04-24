import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import * as schema from "../src/server/db/schema";
import * as relations from "../src/server/db/relations";

const dbSchema = { ...schema, ...relations };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not defined");

// Check if local connection to disable SSL (same logic as src/lib/db.ts)
const isLocalConnection = (() => {
  try {
    const url = new URL(connectionString);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return /localhost|127\.0\.0\.1|::1/i.test(connectionString);
  }
})();

const hasExplicitSslDisable = /sslmode=disable/i.test(connectionString);
const sslConfig = isLocalConnection || hasExplicitSslDisable ? false : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
});

const db = drizzle(pool, { schema: dbSchema });

async function seed() {
  const email = "trizocommunity@gmail.com";
  const password = "trizo786";

  // Check if user already exists
  const existingUser = await db.query.user.findFirst({
    where: (user, { eq }) => eq(user.email, email),
  });

  if (existingUser) {
    console.log(`User with email ${email} already exists.`);
    await pool.end();
    return;
  }

  // Hash password
  const hashedPassword = await hash(password, 10);

  // Create super admin user
  const now = new Date().toISOString();
  const userId = crypto.randomUUID();

  await db.insert(schema.user).values({
    id: userId,
    email,
    password: hashedPassword,
    globalRole: "SUPER_ADMIN",
    fullName: "TRIZO Community Admin",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`✅ Super admin created successfully!`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   ID: ${userId}`);

  await pool.end();
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
