import "dotenv/config";
import { Pool } from "pg";
import {
  buildPoolConfig,
  scrubConnectionString,
} from "../src/core/database/connection";

const rawConnectionString = process.env.DATABASE_URL;
if (!rawConnectionString) {
  throw new Error("DATABASE_URL must be defined in .env");
}

// TypeScript cannot narrow `process.env.DATABASE_URL` after the throw above,
// so the alias keeps the rest of the file free of `!` assertions.
const databaseUrl: string = rawConnectionString;
const connectionString = scrubConnectionString(databaseUrl) || databaseUrl;

/**
 * Refuse to run against anything that looks like production unless --force
 * is passed. Dropping the `public` schema is irreversible and will wipe
 * every row in the target database.
 */
function isProductionUrl(url: string): boolean {
  return (
    !/localhost|127\.0\.0\.1|::1/i.test(url) && !url.includes("neondb_owner")
  );
}

const force =
  process.argv.includes("--force") || process.env.ALLOW_DROP === "true";
if (process.env.NODE_ENV === "production" && !force) {
  throw new Error(
    "Refusing to clean database in production without --force (or ALLOW_DROP=true)",
  );
}
if (isProductionUrl(databaseUrl) && !force) {
  throw new Error(
    "DATABASE_URL looks like a hosted/remote database. Pass --force to clean anyway.",
  );
}

async function clean() {
  const pool = new Pool({
    ...buildPoolConfig(databaseUrl),
    connectionString,
  });
  pool.on("error", (err) => console.error("Database pool error (clean):", err));

  try {
    console.log("Erasing all tables and data from database...");
    await pool.query(
      "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;",
    );
    console.log("Database erased successfully.");
  } finally {
    await pool.end();
  }
}

clean().catch((err) => {
  console.error("Failed to clean database:", err);
  process.exit(1);
});
