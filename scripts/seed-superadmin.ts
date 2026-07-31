import "dotenv/config";
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME } from "./seed/config";
import { buildDb } from "./seed/db";
import { createSuperAdmin } from "./seed/users";

const raw = process.env.DATABASE_URL;
if (!raw) throw new Error("DATABASE_URL must be defined in .env");

const isLocal = /localhost|127\.0\.0\.1|::1/i.test(raw);
const force = process.argv.includes("--force");
if (!isLocal && !force) {
  throw new Error(
    "Refusing to seed against a remote DATABASE_URL. Pass --force to continue.",
  );
}

function maskUrl(url: string): string {
  return url.replace(/:\/\/[^@]+@/, "://***:***@");
}

async function main() {
  const { db, pool } = buildDb();
  try {
    console.log(`Seeding super admin against: ${maskUrl(raw)}`);
    await createSuperAdmin(db);
    console.log(`Done. Admin: ${SUPER_ADMIN_EMAIL} (${SUPER_ADMIN_NAME})`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
